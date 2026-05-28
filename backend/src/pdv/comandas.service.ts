import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comanda } from './entities/comanda.entity';
import { CreateComandaDto, UpdateComandaDto } from './dto/pdv.dto';

@Injectable()
export class ComandasService {
  constructor(
    @InjectRepository(Comanda)
    private readonly repository: Repository<Comanda>,
  ) {}

  findAll(tenantId: string): Promise<Comanda[]> {
    return this.repository.find({
      where: { tenantId },
      relations: ['currentOrder'],
      order: { number: 'ASC' },
    });
  }

  async findOne(id: string, tenantId: string): Promise<Comanda> {
    const comanda = await this.repository.findOne({
      where: { id, tenantId },
      relations: ['currentOrder', 'currentOrder.items'],
    });
    if (!comanda) throw new NotFoundException('Comanda não encontrada');
    return comanda;
  }

  async create(dto: CreateComandaDto, tenantId: string): Promise<Comanda> {
    const existing = await this.repository.findOne({
      where: { tenantId, number: dto.number },
    });
    if (existing) throw new ConflictException('Número de comanda já existe');
    return this.repository.save(
      this.repository.create({
        tenantId,
        number: dto.number,
        label: dto.label?.trim() ?? `Comanda ${dto.number}`,
      }),
    );
  }

  async update(id: string, tenantId: string, dto: UpdateComandaDto): Promise<Comanda> {
    const comanda = await this.findOne(id, tenantId);
    if (dto.label !== undefined) comanda.label = dto.label.trim();
    if (dto.status !== undefined) comanda.status = dto.status;
    return this.repository.save(comanda);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const comanda = await this.findOne(id, tenantId);
    if (comanda.currentOrderId) {
      throw new ConflictException('Comanda com pedido aberto não pode ser excluída');
    }
    await this.repository.remove(comanda);
  }
}
