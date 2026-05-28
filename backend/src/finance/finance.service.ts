import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import * as path from 'path';
import { In, Repository } from 'typeorm';
import { MinioService } from '../minio/minio.service';
import { User } from '../users/entities/user.entity';
import {
  CreateFinanceAccountDto,
  CreateFinanceCategoryDto,
  CreateFinanceSourceDto,
  CreateFinanceTagDto,
  CreateFinanceTransactionDto,
  FinanceTransactionsQueryDto,
  UpdateFinanceAccountDto,
  UpdateFinanceCategoryDto,
  UpdateFinanceSourceDto,
  UpdateFinanceTagDto,
  UpdateFinanceTransactionDto,
} from './dto/finance.dto';
import {
  FinanceAccount,
  FinanceCategory,
  FinanceSource,
  FinanceTag,
  FinanceTransaction,
  FinanceTransactionOrigin,
  FinanceTransactionType,
} from './entities/finance.entities';

export type MemoryUploadedFile = {
  buffer: Buffer;
  size: number;
  mimetype: string;
  originalname: string;
};

const ATTACHMENT_MAX_BYTES = 15 * 1024 * 1024;
const ATTACHMENT_ALLOWED_MIMES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'text/plain',
]);

@Injectable()
export class FinanceService {
  constructor(
    @InjectRepository(FinanceTransaction)
    private readonly transactionsRepo: Repository<FinanceTransaction>,
    @InjectRepository(FinanceAccount)
    private readonly accountsRepo: Repository<FinanceAccount>,
    @InjectRepository(FinanceSource)
    private readonly sourcesRepo: Repository<FinanceSource>,
    @InjectRepository(FinanceCategory)
    private readonly categoriesRepo: Repository<FinanceCategory>,
    @InjectRepository(FinanceTag)
    private readonly tagsRepo: Repository<FinanceTag>,
    private readonly minio: MinioService,
  ) {}

  async getOverview(tenantId: string, query: FinanceTransactionsQueryDto) {
    const transactions = await this.listTransactions(tenantId, query);
    const summary = transactions.reduce(
      (acc, tx) => {
        const amount = Number(tx.amount);
        if (tx.type === FinanceTransactionType.INCOME) {
          acc.totalIncome += amount;
        } else {
          acc.totalExpense += amount;
        }
        acc.balance = acc.totalIncome - acc.totalExpense;
        return acc;
      },
      { totalIncome: 0, totalExpense: 0, balance: 0 },
    );

    const [accounts, sources, categories, tags] = await Promise.all([
      this.accountsRepo.find({ where: { tenantId }, order: { name: 'ASC' } }),
      this.sourcesRepo.find({ where: { tenantId }, order: { name: 'ASC' } }),
      this.categoriesRepo.find({
        where: { tenantId },
        relations: ['parent'],
        order: { level: 'ASC', name: 'ASC' },
      }),
      this.tagsRepo.find({ where: { tenantId }, order: { name: 'ASC' } }),
    ]);

    return { summary, transactions, accounts, sources, categories, tags };
  }

  async listTransactions(tenantId: string, query: FinanceTransactionsQueryDto) {
    const qb = this.transactionsRepo
      .createQueryBuilder('tx')
      .leftJoinAndSelect('tx.account', 'account')
      .leftJoinAndSelect('tx.source', 'source')
      .leftJoinAndSelect('tx.category', 'category')
      .leftJoinAndSelect('tx.tags', 'tags')
      .leftJoinAndSelect('tx.createdByUser', 'createdByUser')
      .where('tx.tenantId = :tenantId', { tenantId });

    if (query.from) {
      qb.andWhere('tx.transactionDate >= :from', { from: query.from });
    }
    if (query.to) {
      qb.andWhere('tx.transactionDate <= :to', { to: query.to });
    }
    if (query.type) {
      qb.andWhere('tx.type = :type', { type: query.type });
    }
    if (query.accountId) {
      qb.andWhere('tx.accountId = :accountId', { accountId: query.accountId });
    }

    qb.orderBy('tx.transactionDate', 'DESC').addOrderBy('tx.createdAt', 'DESC');
    return qb.getMany();
  }

  async createTransaction(
    user: User,
    dto: CreateFinanceTransactionDto,
    file?: MemoryUploadedFile,
  ) {
    const tags = await this.resolveTags(user.tenantId, dto.tagIds);
    await this.validateRefs(user.tenantId, dto);

    const entity = this.transactionsRepo.create({
      tenantId: user.tenantId,
      createdByUserId: user.id,
      type: dto.type,
      description: dto.description.trim(),
      amount: dto.amount,
      transactionDate: dto.transactionDate,
      notes: dto.notes?.trim() || null,
      accountId: dto.accountId ?? null,
      sourceId: dto.sourceId ?? null,
      categoryId: dto.categoryId ?? null,
      tags,
      origin: FinanceTransactionOrigin.MANUAL,
    });
    const saved = await this.transactionsRepo.save(entity);
    if (file) {
      await this.saveAttachment(user.tenantId, saved, file);
    }
    return this.findTransactionOrFail(user.tenantId, saved.id);
  }

  async updateTransaction(
    tenantId: string,
    id: string,
    dto: UpdateFinanceTransactionDto,
    file?: MemoryUploadedFile,
  ) {
    const entity = await this.findTransactionOrFail(tenantId, id);
    if (dto.type !== undefined) entity.type = dto.type;
    if (dto.description !== undefined) entity.description = dto.description.trim();
    if (dto.amount !== undefined) entity.amount = dto.amount;
    if (dto.transactionDate !== undefined) entity.transactionDate = dto.transactionDate;
    if (dto.notes !== undefined) entity.notes = dto.notes?.trim() || null;
    if (dto.accountId !== undefined) entity.accountId = dto.accountId ?? null;
    if (dto.sourceId !== undefined) entity.sourceId = dto.sourceId ?? null;
    if (dto.categoryId !== undefined) entity.categoryId = dto.categoryId ?? null;
    if (dto.tagIds !== undefined) {
      entity.tags = await this.resolveTags(tenantId, dto.tagIds);
    }

    await this.validateRefs(tenantId, {
      type: entity.type,
      description: entity.description,
      amount: Number(entity.amount),
      transactionDate: entity.transactionDate,
      accountId: entity.accountId ?? undefined,
      sourceId: entity.sourceId ?? undefined,
      categoryId: entity.categoryId ?? undefined,
    });

    await this.transactionsRepo.save(entity);

    if (dto.removeAttachment) {
      await this.clearAttachment(entity);
    }
    if (file) {
      await this.saveAttachment(tenantId, entity, file);
    }

    return this.findTransactionOrFail(tenantId, id);
  }

  async removeTransaction(tenantId: string, id: string) {
    const entity = await this.findTransactionOrFail(tenantId, id);
    await this.clearAttachment(entity);
    await this.transactionsRepo.remove(entity);
    return { ok: true };
  }

  async getTransactionAttachmentBuffer(tenantId: string, id: string) {
    const entity = await this.findTransactionOrFail(tenantId, id);
    if (!entity.attachmentKey) {
      throw new NotFoundException('Anexo não encontrado');
    }
    if (!entity.attachmentKey.startsWith(`${tenantId}/`)) {
      throw new ForbiddenException('Anexo inválido');
    }
    const buffer = await this.minio.getFile(entity.attachmentKey);
    return {
      buffer,
      filename: entity.attachmentOriginalName || 'comprovante',
      mimeType: entity.attachmentMimeType || 'application/octet-stream',
    };
  }

  async createAccount(tenantId: string, dto: CreateFinanceAccountDto) {
    return this.accountsRepo.save(
      this.accountsRepo.create({
        tenantId,
        ...dto,
        active: dto.active ?? true,
      }),
    );
  }

  async updateAccount(tenantId: string, id: string, dto: UpdateFinanceAccountDto) {
    const row = await this.findAccountOrFail(tenantId, id);
    Object.assign(row, dto);
    return this.accountsRepo.save(row);
  }

  async removeAccount(tenantId: string, id: string) {
    const used = await this.transactionsRepo.count({ where: { tenantId, accountId: id } });
    if (used > 0) {
      throw new BadRequestException('Conta possui lançamentos vinculados');
    }
    await this.accountsRepo.delete({ id, tenantId });
    return { ok: true };
  }

  async createSource(tenantId: string, dto: CreateFinanceSourceDto) {
    return this.sourcesRepo.save(
      this.sourcesRepo.create({ tenantId, ...dto, active: dto.active ?? true }),
    );
  }

  async updateSource(tenantId: string, id: string, dto: UpdateFinanceSourceDto) {
    const row = await this.findSourceOrFail(tenantId, id);
    Object.assign(row, dto);
    return this.sourcesRepo.save(row);
  }

  async removeSource(tenantId: string, id: string) {
    const used = await this.transactionsRepo.count({ where: { tenantId, sourceId: id } });
    if (used > 0) {
      throw new BadRequestException('Fonte possui lançamentos vinculados');
    }
    await this.sourcesRepo.delete({ id, tenantId });
    return { ok: true };
  }

  async createCategory(tenantId: string, dto: CreateFinanceCategoryDto) {
    if (dto.parentId) {
      await this.findCategoryOrFail(tenantId, dto.parentId);
    }
    return this.categoriesRepo.save(
      this.categoriesRepo.create({
        tenantId,
        ...dto,
        active: dto.active ?? true,
      }),
    );
  }

  async updateCategory(tenantId: string, id: string, dto: UpdateFinanceCategoryDto) {
    const row = await this.findCategoryOrFail(tenantId, id);
    if (dto.parentId === id) {
      throw new BadRequestException('Categoria não pode ser pai de si mesma');
    }
    if (dto.parentId) {
      await this.findCategoryOrFail(tenantId, dto.parentId);
    }
    Object.assign(row, dto);
    return this.categoriesRepo.save(row);
  }

  async removeCategory(tenantId: string, id: string) {
    const used = await this.transactionsRepo.count({ where: { tenantId, categoryId: id } });
    if (used > 0) {
      throw new BadRequestException('Categoria possui lançamentos vinculados');
    }
    await this.categoriesRepo.delete({ id, tenantId });
    return { ok: true };
  }

  async createTag(tenantId: string, dto: CreateFinanceTagDto) {
    return this.tagsRepo.save(
      this.tagsRepo.create({
        tenantId,
        name: dto.name.trim(),
        color: dto.color ?? '#2563eb',
        active: dto.active ?? true,
      }),
    );
  }

  async updateTag(tenantId: string, id: string, dto: UpdateFinanceTagDto) {
    const row = await this.findTagOrFail(tenantId, id);
    if (dto.name !== undefined) row.name = dto.name.trim();
    Object.assign(row, dto);
    return this.tagsRepo.save(row);
  }

  async removeTag(tenantId: string, id: string) {
    await this.tagsRepo.delete({ id, tenantId });
    return { ok: true };
  }

  private async findTransactionOrFail(tenantId: string, id: string) {
    const row = await this.transactionsRepo.findOne({
      where: { id, tenantId },
      relations: ['account', 'source', 'category', 'tags', 'createdByUser'],
    });
    if (!row) throw new NotFoundException('Lançamento não encontrado');
    return row;
  }

  private async findAccountOrFail(tenantId: string, id: string) {
    const row = await this.accountsRepo.findOne({ where: { id, tenantId } });
    if (!row) throw new NotFoundException('Conta não encontrada');
    return row;
  }

  private async findSourceOrFail(tenantId: string, id: string) {
    const row = await this.sourcesRepo.findOne({ where: { id, tenantId } });
    if (!row) throw new NotFoundException('Fonte não encontrada');
    return row;
  }

  private async findCategoryOrFail(tenantId: string, id: string) {
    const row = await this.categoriesRepo.findOne({ where: { id, tenantId } });
    if (!row) throw new NotFoundException('Categoria não encontrada');
    return row;
  }

  private async findTagOrFail(tenantId: string, id: string) {
    const row = await this.tagsRepo.findOne({ where: { id, tenantId } });
    if (!row) throw new NotFoundException('Tag não encontrada');
    return row;
  }

  private async resolveTags(tenantId: string, tagIds?: string[]) {
    if (!tagIds?.length) return [];
    const tags = await this.tagsRepo.find({
      where: { tenantId, id: In(tagIds), active: true },
    });
    if (tags.length !== tagIds.length) {
      throw new BadRequestException('Uma ou mais tags são inválidas');
    }
    return tags;
  }

  private async validateRefs(
    tenantId: string,
    dto: Pick<
      CreateFinanceTransactionDto,
      'type' | 'description' | 'amount' | 'transactionDate' | 'accountId' | 'sourceId' | 'categoryId'
    >,
  ) {
    if (dto.accountId) await this.findAccountOrFail(tenantId, dto.accountId);
    if (dto.sourceId) {
      const source = await this.findSourceOrFail(tenantId, dto.sourceId);
      if (source.type !== dto.type) {
        throw new BadRequestException('Fonte incompatível com o tipo do lançamento');
      }
    }
    if (dto.categoryId) {
      const category = await this.findCategoryOrFail(tenantId, dto.categoryId);
      if (category.type !== dto.type) {
        throw new BadRequestException('Categoria incompatível com o tipo do lançamento');
      }
    }
  }

  private assertAttachmentAllowed(file: MemoryUploadedFile) {
    if (!file?.buffer?.length) throw new BadRequestException('Arquivo vazio');
    if (file.size > ATTACHMENT_MAX_BYTES) {
      throw new BadRequestException('Arquivo muito grande (máximo 15 MB)');
    }
    if (!ATTACHMENT_ALLOWED_MIMES.has(file.mimetype)) {
      throw new BadRequestException('Tipo de arquivo não permitido');
    }
  }

  private buildAttachmentKey(tenantId: string, txId: string, originalName: string) {
    const ext = path.extname(originalName).slice(0, 32);
    const base = path
      .basename(originalName, ext)
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(0, 120);
    return `${tenantId}/finance-transactions/${txId}/${randomUUID()}_${base || 'arquivo'}${ext}`;
  }

  private async saveAttachment(
    tenantId: string,
    entity: FinanceTransaction,
    file: MemoryUploadedFile,
  ) {
    this.assertAttachmentAllowed(file);
    const prev = entity.attachmentKey;
    const key = this.buildAttachmentKey(tenantId, entity.id, file.originalname);
    await this.minio.uploadFile(key, file.buffer);
    if (prev && prev !== key) {
      try {
        await this.minio.deleteFile(prev);
      } catch {
        /* ignore */
      }
    }
    entity.attachmentKey = key;
    entity.attachmentMimeType = file.mimetype.slice(0, 255);
    entity.attachmentOriginalName = file.originalname.slice(0, 500);
    await this.transactionsRepo.save(entity);
  }

  /** Lançamento gerado por outros módulos (transferência, folha, etc.). */
  async createSystemTransaction(
    tenantId: string,
    userId: string | null,
    dto: CreateFinanceTransactionDto,
    origin: FinanceTransactionOrigin,
    referenceId?: string | null,
    cashSessionId?: string | null,
  ) {
    const tags = await this.resolveTags(tenantId, dto.tagIds);
    await this.validateRefs(tenantId, dto);
    const entity = this.transactionsRepo.create({
      tenantId,
      createdByUserId: userId,
      type: dto.type,
      description: dto.description.trim(),
      amount: dto.amount,
      transactionDate: dto.transactionDate,
      notes: dto.notes?.trim() || null,
      accountId: dto.accountId ?? null,
      sourceId: dto.sourceId ?? null,
      categoryId: dto.categoryId ?? null,
      tags,
      origin,
      referenceId: referenceId ?? null,
      cashSessionId: cashSessionId ?? null,
    });
    return this.transactionsRepo.save(entity);
  }

  private async clearAttachment(entity: FinanceTransaction) {
    if (!entity.attachmentKey) return;
    try {
      await this.minio.deleteFile(entity.attachmentKey);
    } catch {
      /* ignore */
    }
    entity.attachmentKey = null;
    entity.attachmentMimeType = null;
    entity.attachmentOriginalName = null;
    await this.transactionsRepo.save(entity);
  }
}
