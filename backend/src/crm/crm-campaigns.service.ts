import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Product } from '../products/entities/product.entity';
import { CrmCampaignProduct } from './entities/crm-campaign-product.entity';
import { CrmCampaign } from './entities/crm-campaign.entity';
import { CreateCrmCampaignDto, UpdateCrmCampaignDto } from './dto/crm.dto';

export type CrmCampaignProductSummary = {
  id: string;
  name: string;
  salePrice: string;
  groupName: string | null;
};

export type CrmCampaignResponse = CrmCampaign & {
  productIds: string[];
  products: CrmCampaignProductSummary[];
};

@Injectable()
export class CrmCampaignsService {
  constructor(
    @InjectRepository(CrmCampaign)
    private readonly repository: Repository<CrmCampaign>,
    @InjectRepository(CrmCampaignProduct)
    private readonly campaignProductRepository: Repository<CrmCampaignProduct>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  private async loadProductLinks(
    campaignId: string,
    tenantId: string,
  ): Promise<CrmCampaignProduct[]> {
    return this.campaignProductRepository.find({
      where: { campaignId, tenantId },
      relations: ['product', 'product.group'],
      order: { product: { name: 'ASC' } },
    });
  }

  private toResponse(
    campaign: CrmCampaign,
    links: CrmCampaignProduct[],
  ): CrmCampaignResponse {
    return {
      ...campaign,
      productIds: links.map((l) => l.productId),
      products: links.map((l) => ({
        id: l.product.id,
        name: l.product.name,
        salePrice: l.product.salePrice,
        groupName: l.product.group?.name ?? null,
      })),
    };
  }

  private async syncProducts(
    campaignId: string,
    tenantId: string,
    productIds?: string[],
  ): Promise<void> {
    await this.campaignProductRepository.delete({ campaignId, tenantId });

    const uniqueIds = [...new Set(productIds ?? [])];
    if (uniqueIds.length === 0) return;

    const products = await this.productRepository.find({
      where: { tenantId, id: In(uniqueIds), active: true },
    });
    if (products.length !== uniqueIds.length) {
      throw new BadRequestException(
        'Um ou mais produtos do cardápio são inválidos ou estão inativos',
      );
    }

    await this.campaignProductRepository.save(
      uniqueIds.map((productId) =>
        this.campaignProductRepository.create({
          tenantId,
          campaignId,
          productId,
        }),
      ),
    );
  }

  async findAll(tenantId: string, status?: string): Promise<CrmCampaignResponse[]> {
    const campaigns = await this.repository.find({
      where: { tenantId, ...(status ? { status: status as CrmCampaign['status'] } : {}) },
      order: { createdAt: 'DESC' },
    });
    return Promise.all(
      campaigns.map(async (campaign) => {
        const links = await this.loadProductLinks(campaign.id, tenantId);
        return this.toResponse(campaign, links);
      }),
    );
  }

  async findOne(id: string, tenantId: string): Promise<CrmCampaignResponse> {
    const campaign = await this.repository.findOne({ where: { id, tenantId } });
    if (!campaign) throw new NotFoundException('Campanha não encontrada');
    const links = await this.loadProductLinks(id, tenantId);
    return this.toResponse(campaign, links);
  }

  async create(dto: CreateCrmCampaignDto, tenantId: string): Promise<CrmCampaignResponse> {
    const entity = this.repository.create({
      tenantId,
      name: dto.name.trim(),
      description: dto.description?.trim() ?? null,
      type: dto.type,
      status: dto.status,
      channel: dto.channel,
      discountType: dto.discountType,
      discountValue: (dto.discountValue ?? 0).toFixed(2),
      audienceSegment: dto.audienceSegment ?? null,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
    });
    const saved = await this.repository.save(entity);
    await this.syncProducts(saved.id, tenantId, dto.productIds);
    return this.findOne(saved.id, tenantId);
  }

  async update(
    id: string,
    tenantId: string,
    dto: UpdateCrmCampaignDto,
  ): Promise<CrmCampaignResponse> {
    const campaign = await this.repository.findOne({ where: { id, tenantId } });
    if (!campaign) throw new NotFoundException('Campanha não encontrada');

    if (dto.name) campaign.name = dto.name.trim();
    if (dto.description !== undefined) campaign.description = dto.description?.trim() ?? null;
    if (dto.type !== undefined) campaign.type = dto.type;
    if (dto.status !== undefined) campaign.status = dto.status;
    if (dto.channel !== undefined) campaign.channel = dto.channel;
    if (dto.discountType !== undefined) campaign.discountType = dto.discountType;
    if (dto.discountValue !== undefined) campaign.discountValue = dto.discountValue.toFixed(2);
    if (dto.audienceSegment !== undefined) campaign.audienceSegment = dto.audienceSegment ?? null;
    if (dto.startsAt !== undefined) campaign.startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    if (dto.endsAt !== undefined) campaign.endsAt = dto.endsAt ? new Date(dto.endsAt) : null;

    await this.repository.save(campaign);
    if (dto.productIds !== undefined) {
      await this.syncProducts(id, tenantId, dto.productIds);
    }
    return this.findOne(id, tenantId);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const campaign = await this.repository.findOne({ where: { id, tenantId } });
    if (!campaign) throw new NotFoundException('Campanha não encontrada');
    await this.repository.remove(campaign);
  }
}
