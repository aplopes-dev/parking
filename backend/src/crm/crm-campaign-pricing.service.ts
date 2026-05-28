import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../products/entities/product.entity';
import { CrmCampaignProduct } from './entities/crm-campaign-product.entity';
import { CrmCampaign } from './entities/crm-campaign.entity';
import { CrmCampaignStatus, CrmDiscountType } from './entities/crm.enums';

export type ProductPromoPrice = {
  price: number;
  originalPrice: number;
  campaignName: string;
  promoLabel: string;
};

@Injectable()
export class CrmCampaignPricingService {
  constructor(
    @InjectRepository(CrmCampaignProduct)
    private readonly campaignProductRepository: Repository<CrmCampaignProduct>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  private roundMoney(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private isCampaignActive(campaign: CrmCampaign, at: Date): boolean {
    if (campaign.status !== CrmCampaignStatus.ATIVA) return false;
    if (campaign.discountType === CrmDiscountType.NENHUM) return false;
    if (campaign.startsAt) {
      const start = new Date(campaign.startsAt);
      if (at.getTime() < start.getTime()) return false;
    }
    if (campaign.endsAt) {
      const end = new Date(campaign.endsAt);
      if (at.getTime() > end.getTime()) return false;
    }
    return true;
  }

  applyDiscount(
    basePrice: number,
    discountType: CrmDiscountType,
    discountValue: number,
  ): number {
    if (discountType === CrmDiscountType.PERCENTUAL) {
      return this.roundMoney(basePrice * (1 - discountValue / 100));
    }
    if (discountType === CrmDiscountType.VALOR_FIXO) {
      return this.roundMoney(Math.max(0, basePrice - discountValue));
    }
    return basePrice;
  }

  private promoLabel(campaign: CrmCampaign): string {
    const value = parseFloat(campaign.discountValue);
    if (campaign.discountType === CrmDiscountType.PERCENTUAL) {
      return `-${value}%`;
    }
    if (campaign.discountType === CrmDiscountType.VALOR_FIXO) {
      return `Promo R$ ${value.toFixed(2)}`;
    }
    return 'Promo';
  }

  /** Melhor preço promocional por produto (campanhas ativas no salão). */
  async getPromoPriceMap(tenantId: string): Promise<Map<string, ProductPromoPrice>> {
    const now = new Date();
    const links = await this.campaignProductRepository.find({
      where: { tenantId },
      relations: ['campaign', 'product'],
    });

    const map = new Map<string, ProductPromoPrice>();

    for (const link of links) {
      const campaign = link.campaign;
      const product = link.product;
      if (!campaign || product.active === false) continue;
      if (!this.isCampaignActive(campaign, now)) continue;

      const originalPrice = parseFloat(product.salePrice);
      const price = this.applyDiscount(
        originalPrice,
        campaign.discountType,
        parseFloat(campaign.discountValue),
      );
      if (price >= originalPrice) continue;

      const candidate: ProductPromoPrice = {
        price,
        originalPrice,
        campaignName: campaign.name,
        promoLabel: this.promoLabel(campaign),
      };

      const existing = map.get(link.productId);
      if (!existing || candidate.price < existing.price) {
        map.set(link.productId, candidate);
      }
    }

    return map;
  }

  /** Preço unitário para lançar na comanda (respeita campanha ativa). */
  async resolveUnitPrice(
    tenantId: string,
    productId: string,
  ): Promise<{ unitPrice: number; originalPrice: number; promoLabel: string | null }> {
    const product = await this.productRepository.findOne({
      where: { id: productId, tenantId, active: true },
    });
    if (!product) {
      return { unitPrice: 0, originalPrice: 0, promoLabel: null };
    }

    const originalPrice = parseFloat(product.salePrice);
    const map = await this.getPromoPriceMap(tenantId);
    const promo = map.get(productId);
    if (promo) {
      return {
        unitPrice: promo.price,
        originalPrice: promo.originalPrice,
        promoLabel: promo.promoLabel,
      };
    }
    return { unitPrice: originalPrice, originalPrice, promoLabel: null };
  }

  /** Mapa serializado para o SmartPOS (cardápio do garçom). */
  async getPromoPricesRecord(
    tenantId: string,
  ): Promise<Record<string, ProductPromoPrice>> {
    const map = await this.getPromoPriceMap(tenantId);
    return Object.fromEntries(map.entries());
  }
}
