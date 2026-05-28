import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Order } from '../pdv/entities/order.entity';
import { OrderItem } from '../pdv/entities/order-item.entity';
import { MinioService } from '../minio/minio.service';
import { User } from '../users/entities/user.entity';
import {
  buildPaginatedMeta,
  resolvePagination,
} from '../common/dto/pagination-query.dto';
import {
  CancelFiscalInvoiceDto,
  CreateFiscalAccountantDto,
  CreateFiscalNumberVoidDto,
  CreateFiscalOrderDto,
  CreateFiscalOrderFromPdvDto,
  CreateFiscalReturnDto,
  EmitFiscalInvoiceDto,
  FISCAL_RETURN_SORT_FIELDS,
  FiscalInvoicesQueryDto,
  FiscalOrdersQueryDto,
  FiscalReturnsQueryDto,
  FiscalReturnSortField,
  UpdateFiscalReturnDto,
  UpdateFiscalAccountantDto,
  UpdateFiscalOrderDto,
  UpdateFiscalSettingsDto,
} from './dto/fiscal.dto';
import {
  FiscalAccountant,
  FiscalInvoice,
  FiscalInvoiceDirection,
  FiscalInvoiceStatus,
  FiscalInvoiceType,
  FiscalNumberVoid,
  FiscalOrder,
  FiscalOrderItem,
  FiscalOrderStatus,
  FiscalOrderType,
  FiscalReturn,
  FiscalSettings,
} from './entities/fiscal.entities';

@Injectable()
export class FiscalService {
  constructor(
    @InjectRepository(FiscalSettings) private readonly settingsRepo: Repository<FiscalSettings>,
    @InjectRepository(FiscalOrder) private readonly ordersRepo: Repository<FiscalOrder>,
    @InjectRepository(FiscalOrderItem) private readonly orderItemsRepo: Repository<FiscalOrderItem>,
    @InjectRepository(FiscalReturn) private readonly returnsRepo: Repository<FiscalReturn>,
    @InjectRepository(FiscalInvoice) private readonly invoicesRepo: Repository<FiscalInvoice>,
    @InjectRepository(FiscalNumberVoid) private readonly voidsRepo: Repository<FiscalNumberVoid>,
    @InjectRepository(FiscalAccountant) private readonly accountantsRepo: Repository<FiscalAccountant>,
    @InjectRepository(Order) private readonly pdvOrdersRepo: Repository<Order>,
    @InjectRepository(OrderItem) private readonly pdvItemsRepo: Repository<OrderItem>,
    private readonly minio: MinioService,
  ) {}

  async getOrCreateSettings(tenantId: string) {
    let row = await this.settingsRepo.findOne({ where: { tenantId } });
    if (!row) {
      row = await this.settingsRepo.save(this.settingsRepo.create({ tenantId, legalName: '' }));
    }
    return row;
  }

  updateSettings(tenantId: string, dto: UpdateFiscalSettingsDto) {
    return this.getOrCreateSettings(tenantId).then(async (row) => {
      Object.assign(row, dto);
      return this.settingsRepo.save(row);
    });
  }

  private sumItems(items: { quantity: number; unitPrice: number }[]) {
    return items.reduce((s, i) => s + Number(i.quantity) * Number(i.unitPrice), 0);
  }

  async listOrders(tenantId: string, query: FiscalOrdersQueryDto) {
    const where: Record<string, unknown> = { tenantId };
    if (query.orderType) where.orderType = query.orderType;
    if (query.status) where.status = query.status;
    if (query.from && query.to) where.issueDate = Between(query.from, query.to);

    return this.ordersRepo.find({
      where,
      relations: ['items', 'pdvOrder', 'customer'],
      order: { issueDate: 'DESC', createdAt: 'DESC' },
    });
  }

  async getOrder(tenantId: string, id: string) {
    const row = await this.ordersRepo.findOne({
      where: { id, tenantId },
      relations: ['items', 'pdvOrder', 'customer', 'createdByUser'],
    });
    if (!row) throw new NotFoundException('Pedido fiscal não encontrado');
    return row;
  }

  async createOrder(user: User, dto: CreateFiscalOrderDto) {
    const total = this.sumItems(dto.items);
    const order = await this.ordersRepo.save(
      this.ordersRepo.create({
        tenantId: user.tenantId,
        orderType: dto.orderType,
        status: FiscalOrderStatus.DRAFT,
        referenceCode: dto.referenceCode ?? null,
        pdvOrderId: dto.pdvOrderId ?? null,
        customerId: dto.customerId ?? null,
        counterpartyName: dto.counterpartyName,
        counterpartyDocument: dto.counterpartyDocument ?? null,
        issueDate: dto.issueDate,
        totalAmount: total,
        notes: dto.notes ?? null,
        createdByUserId: user.id,
      }),
    );
    await this.saveOrderItems(order.id, dto.items);
    return this.getOrder(user.tenantId, order.id);
  }

  private async saveOrderItems(
    fiscalOrderId: string,
    items: CreateFiscalOrderDto['items'],
  ) {
    await this.orderItemsRepo.delete({ fiscalOrderId });
    for (const item of items) {
      const totalPrice = Number(item.quantity) * Number(item.unitPrice);
      await this.orderItemsRepo.save(
        this.orderItemsRepo.create({
          fiscalOrderId,
          productName: item.productName,
          ncm: item.ncm ?? null,
          cfop: item.cfop ?? null,
          unit: item.unit ?? 'UN',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice,
        }),
      );
    }
  }

  async updateOrder(tenantId: string, id: string, dto: UpdateFiscalOrderDto) {
    const order = await this.getOrder(tenantId, id);
    if (dto.items) {
      order.totalAmount = this.sumItems(dto.items);
      await this.saveOrderItems(id, dto.items);
    }
    if (dto.status !== undefined) order.status = dto.status;
    if (dto.counterpartyName !== undefined) order.counterpartyName = dto.counterpartyName;
    if (dto.counterpartyDocument !== undefined) order.counterpartyDocument = dto.counterpartyDocument;
    if (dto.issueDate !== undefined) order.issueDate = dto.issueDate;
    if (dto.notes !== undefined) order.notes = dto.notes;
    await this.ordersRepo.save(order);
    return this.getOrder(tenantId, id);
  }

  async createOrderFromPdv(user: User, dto: CreateFiscalOrderFromPdvDto) {
    const pdv = await this.pdvOrdersRepo.findOne({
      where: { id: dto.pdvOrderId, tenantId: user.tenantId },
      relations: ['customer'],
    });
    if (!pdv) throw new NotFoundException('Pedido PDV não encontrado');

    const pdvItems = await this.pdvItemsRepo.find({
      where: { orderId: pdv.id },
      relations: ['product'],
    });

    const counterpartyName =
      pdv.customer?.name ?? `Pedido #${pdv.orderNumber}`;
    const counterpartyDocument = pdv.customer?.document ?? undefined;

    return this.createOrder(user, {
      orderType: dto.orderType,
      referenceCode: `PDV-${pdv.orderNumber}`,
      pdvOrderId: pdv.id,
      customerId: pdv.customerId ?? undefined,
      counterpartyName,
      counterpartyDocument,
      issueDate: (pdv.closedAt ?? pdv.openedAt).toISOString().slice(0, 10),
      notes: pdv.notes ?? undefined,
      items: pdvItems.map((line) => ({
        productName: line.product?.name ?? line.productName ?? 'Item',
        quantity: Number(line.quantity),
        unitPrice: Number(line.unitPrice),
        cfop: dto.orderType === FiscalOrderType.SALE ? '5102' : '1102',
      })),
    });
  }

  async listReturns(tenantId: string, query: FiscalReturnsQueryDto) {
    const { page, limit, skip, sortOrder } = resolvePagination(query);
    const sortBy: FiscalReturnSortField = FISCAL_RETURN_SORT_FIELDS.includes(
      query.sortBy as FiscalReturnSortField,
    )
      ? (query.sortBy as FiscalReturnSortField)
      : 'returnDate';

    const qb = this.returnsRepo
      .createQueryBuilder('r')
      .where('r.tenantId = :tenantId', { tenantId });

    if (query.returnType) {
      qb.andWhere('"r"."return_type" = :returnType', { returnType: query.returnType });
    }
    if (query.search?.trim()) {
      const term = `%${query.search.trim()}%`;
      qb.andWhere('("r"."reason" ILIKE :term OR "r"."return_type"::text ILIKE :term)', { term });
    }
    if (query.dateFrom) {
      qb.andWhere('"r"."return_date" >= :dateFrom', { dateFrom: query.dateFrom });
    }
    if (query.dateTo) {
      qb.andWhere('"r"."return_date" <= :dateTo', { dateTo: query.dateTo });
    }

    const sortColumnMap: Record<FiscalReturnSortField, string> = {
      createdAt: 'r.createdAt',
      returnDate: 'r.returnDate',
      returnType: 'r.returnType',
      totalAmount: 'r.totalAmount',
      reason: 'r.reason',
    };
    const total = await qb.getCount();
    qb.orderBy(sortColumnMap[sortBy], sortOrder).addOrderBy('r.createdAt', 'DESC');
    const data = await qb.skip(skip).take(limit).getMany();
    return buildPaginatedMeta(data, total, page, limit, sortBy, sortOrder);
  }

  async createReturn(user: User, dto: CreateFiscalReturnDto) {
    return this.returnsRepo.save(
      this.returnsRepo.create({
        tenantId: user.tenantId,
        returnType: dto.returnType,
        fiscalOrderId: dto.fiscalOrderId ?? null,
        fiscalInvoiceId: dto.fiscalInvoiceId ?? null,
        reason: dto.reason,
        returnDate: dto.returnDate,
        totalAmount: dto.totalAmount,
        createdByUserId: user.id,
      }),
    );
  }

  async updateReturn(tenantId: string, id: string, dto: UpdateFiscalReturnDto) {
    const row = await this.returnsRepo.findOne({ where: { id, tenantId } });
    if (!row) throw new NotFoundException('Devolução não encontrada');
    if (dto.returnType !== undefined) row.returnType = dto.returnType;
    if (dto.fiscalOrderId !== undefined) row.fiscalOrderId = dto.fiscalOrderId ?? null;
    if (dto.fiscalInvoiceId !== undefined) row.fiscalInvoiceId = dto.fiscalInvoiceId ?? null;
    if (dto.reason !== undefined) row.reason = dto.reason;
    if (dto.returnDate !== undefined) row.returnDate = dto.returnDate;
    if (dto.totalAmount !== undefined) row.totalAmount = dto.totalAmount;
    return this.returnsRepo.save(row);
  }

  async deleteReturn(tenantId: string, id: string) {
    const row = await this.returnsRepo.findOne({ where: { id, tenantId } });
    if (!row) throw new NotFoundException('Devolução não encontrada');
    await this.returnsRepo.remove(row);
    return { ok: true };
  }

  listInvoices(tenantId: string, query: FiscalInvoicesQueryDto) {
    const where: Record<string, unknown> = { tenantId };
    if (query.invoiceType) where.invoiceType = query.invoiceType;
    if (query.direction) where.direction = query.direction;
    if (query.status) where.status = query.status;

    return this.invoicesRepo.find({
      where,
      order: { issueDate: 'DESC', number: 'DESC' },
    });
  }

  async getInvoice(tenantId: string, id: string) {
    const row = await this.invoicesRepo.findOne({ where: { id, tenantId } });
    if (!row) throw new NotFoundException('Nota não encontrada');
    return row;
  }

  private generateAccessKey(cnpj: string | null | undefined, number: number, series: number) {
    const base = (cnpj ?? '00000000000000').replace(/\D/g, '').padStart(14, '0').slice(0, 14);
    const payload = `${base}${String(series).padStart(3, '0')}${String(number).padStart(9, '0')}`;
    const checksum = String(
      payload.split('').reduce((a, c) => a + parseInt(c, 10), 0) % 100,
    ).padStart(2, '0');
    return `${payload}${checksum}`.padEnd(44, '0').slice(0, 44);
  }

  async emitInvoice(user: User, dto: EmitFiscalInvoiceDto) {
    const settings = await this.getOrCreateSettings(user.tenantId);
    if (!settings.cnpj?.trim()) {
      throw new BadRequestException('Configure o CNPJ em Configurações fiscais antes de emitir');
    }

    let fiscalOrder: FiscalOrder | null = null;
    let pdvOrderId = dto.pdvOrderId ?? null;
    let total = 0;
    let counterpartyName = dto.counterpartyName ?? settings.tradeName ?? settings.legalName;
    let counterpartyDocument = dto.counterpartyDocument ?? null;

    if (dto.fiscalOrderId) {
      fiscalOrder = await this.getOrder(user.tenantId, dto.fiscalOrderId);
      total = Number(fiscalOrder.totalAmount);
      counterpartyName = fiscalOrder.counterpartyName;
      counterpartyDocument = fiscalOrder.counterpartyDocument ?? null;
      pdvOrderId = fiscalOrder.pdvOrderId ?? pdvOrderId;
    } else if (dto.pdvOrderId) {
      const pdv = await this.pdvOrdersRepo.findOne({
        where: { id: dto.pdvOrderId, tenantId: user.tenantId },
        relations: ['customer'],
      });
      if (!pdv) throw new NotFoundException('Pedido PDV não encontrado');
      total = Number(pdv.total);
      counterpartyName = pdv.customer?.name ?? counterpartyName;
      counterpartyDocument = pdv.customer?.document ?? counterpartyDocument;
    } else {
      throw new BadRequestException('Informe fiscalOrderId ou pdvOrderId');
    }

    const isNfce = dto.invoiceType === FiscalInvoiceType.NFCE;
    const series = isNfce ? settings.nfceSeries : settings.nfeSeries;
    const nextNumber = isNfce ? settings.lastNfceNumber + 1 : settings.lastNfeNumber + 1;

    const invoice = await this.invoicesRepo.save(
      this.invoicesRepo.create({
        tenantId: user.tenantId,
        invoiceType: dto.invoiceType,
        direction: FiscalInvoiceDirection.EMITTED,
        status: FiscalInvoiceStatus.PROCESSING,
        series,
        number: nextNumber,
        accessKey: null,
        issueDate: new Date(),
        counterpartyName,
        counterpartyDocument,
        totalAmount: total,
        fiscalOrderId: fiscalOrder?.id ?? null,
        pdvOrderId,
        createdByUserId: user.id,
      }),
    );

    const homologation = settings.environment === 'homologation';
    invoice.status = homologation
      ? FiscalInvoiceStatus.AUTHORIZED
      : FiscalInvoiceStatus.AUTHORIZED;
    invoice.accessKey = this.generateAccessKey(settings.cnpj, nextNumber, series);
    if (homologation) {
      invoice.rejectionMessage = null;
    }
    await this.invoicesRepo.save(invoice);

    if (isNfce) settings.lastNfceNumber = nextNumber;
    else settings.lastNfeNumber = nextNumber;
    await this.settingsRepo.save(settings);

    if (fiscalOrder && fiscalOrder.status === FiscalOrderStatus.DRAFT) {
      fiscalOrder.status = FiscalOrderStatus.CONFIRMED;
      await this.ordersRepo.save(fiscalOrder);
    }

    return invoice;
  }

  async cancelInvoice(user: User, id: string, dto: CancelFiscalInvoiceDto) {
    const invoice = await this.getInvoice(user.tenantId, id);
    if (invoice.direction !== FiscalInvoiceDirection.EMITTED) {
      throw new BadRequestException('Somente notas emitidas podem ser canceladas');
    }
    if (invoice.status === FiscalInvoiceStatus.CANCELLED) {
      throw new BadRequestException('Nota já cancelada');
    }
    if (![FiscalInvoiceStatus.AUTHORIZED, FiscalInvoiceStatus.PROCESSING].includes(invoice.status)) {
      throw new BadRequestException('Status da nota não permite cancelamento');
    }
    invoice.status = FiscalInvoiceStatus.CANCELLED;
    invoice.cancellationReason = dto.reason;
    invoice.cancelledAt = new Date();
    return this.invoicesRepo.save(invoice);
  }

  parseXmlFields(xml: string) {
    const pick = (tag: string) => {
      const m = xml.match(new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`, 'i'));
      return m?.[1]?.trim() ?? null;
    };
    const number = parseInt(pick('nNF') ?? pick('nCT') ?? '0', 10) || null;
    const series = parseInt(pick('serie') ?? '1', 10);
    const total = parseFloat(pick('vNF') ?? pick('vProd') ?? '0') || 0;
    const accessKey =
      xml.match(/Id="NFe(\d{44})"/i)?.[1] ??
      xml.match(/<chNFe>(\d{44})<\/chNFe>/i)?.[1] ??
      null;
    return {
      number,
      series,
      totalAmount: total,
      counterpartyName: pick('xNome') ?? 'Fornecedor',
      counterpartyDocument: pick('CNPJ') ?? pick('CPF'),
      issueDate: pick('dhEmi')?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
      accessKey,
    };
  }

  async importInvoice(
    user: User,
    xmlContent: string,
    invoiceType?: FiscalInvoiceType,
    fileBuffer?: Buffer,
  ) {
    if (!xmlContent?.trim()) throw new BadRequestException('XML vazio');
    const parsed = this.parseXmlFields(xmlContent);
    const type =
      invoiceType ??
      (xmlContent.includes('<mod>65</mod>') ? FiscalInvoiceType.NFCE : FiscalInvoiceType.NFE);

    let storageKey: string | null = null;
    if (fileBuffer) {
      storageKey = `fiscal/${user.tenantId}/import-${Date.now()}.xml`;
      await this.minio.uploadFile(storageKey, fileBuffer);
    }

    return this.invoicesRepo.save(
      this.invoicesRepo.create({
        tenantId: user.tenantId,
        invoiceType: type,
        direction: FiscalInvoiceDirection.RECEIVED,
        status: FiscalInvoiceStatus.AUTHORIZED,
        number: parsed.number,
        series: parsed.series,
        accessKey: parsed.accessKey,
        issueDate: new Date(parsed.issueDate),
        counterpartyName: parsed.counterpartyName,
        counterpartyDocument: parsed.counterpartyDocument,
        totalAmount: parsed.totalAmount,
        xmlStorageKey: storageKey,
        createdByUserId: user.id,
      }),
    );
  }

  listNumberVoids(tenantId: string) {
    return this.voidsRepo.find({
      where: { tenantId },
      order: { voidDate: 'DESC' },
    });
  }

  createNumberVoid(user: User, dto: CreateFiscalNumberVoidDto) {
    if (dto.numberFrom > dto.numberTo) {
      throw new BadRequestException('Faixa inválida');
    }
    return this.voidsRepo.save(
      this.voidsRepo.create({
        tenantId: user.tenantId,
        ...dto,
        createdByUserId: user.id,
      }),
    );
  }

  listAccountants(tenantId: string) {
    return this.accountantsRepo.find({
      where: { tenantId },
      relations: ['user'],
      order: { name: 'ASC' },
    });
  }

  createAccountant(tenantId: string, dto: CreateFiscalAccountantDto) {
    return this.accountantsRepo.save(
      this.accountantsRepo.create({ tenantId, ...dto }),
    );
  }

  async updateAccountant(tenantId: string, id: string, dto: UpdateFiscalAccountantDto) {
    const row = await this.accountantsRepo.findOne({ where: { id, tenantId } });
    if (!row) throw new NotFoundException('Contador não encontrado');
    Object.assign(row, dto);
    return this.accountantsRepo.save(row);
  }

  async deleteAccountant(tenantId: string, id: string) {
    const row = await this.accountantsRepo.findOne({ where: { id, tenantId } });
    if (!row) throw new NotFoundException('Contador não encontrado');
    await this.accountantsRepo.remove(row);
    return { ok: true };
  }

  getOverview(tenantId: string) {
    return Promise.all([
      this.getOrCreateSettings(tenantId),
      this.ordersRepo.count({ where: { tenantId } }),
      this.invoicesRepo.count({
        where: { tenantId, direction: FiscalInvoiceDirection.EMITTED },
      }),
      this.invoicesRepo.count({
        where: { tenantId, direction: FiscalInvoiceDirection.RECEIVED },
      }),
      this.invoicesRepo.count({
        where: { tenantId, status: FiscalInvoiceStatus.AUTHORIZED },
      }),
    ]).then(([settings, ordersCount, emittedCount, receivedCount, authorizedCount]) => ({
      settings,
      ordersCount,
      emittedCount,
      receivedCount,
      authorizedCount,
    }));
  }
}
