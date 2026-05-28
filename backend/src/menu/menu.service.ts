import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MenuSettings } from './entities/menu-settings.entity';
import { MenuProduct } from './entities/menu-product.entity';
import { MenuChannel } from './entities/menu.enums';
import { Product } from '../products/entities/product.entity';
import { ProductGroup } from '../product-groups/entities/product-group.entity';
import { SyncMenuProductsDto, UpdateMenuSettingsDto } from './dto/menu.dto';

export type MenuCatalogItem = {
  product: Product;
  entry: MenuProduct | null;
  visible: boolean;
  featured: boolean;
  sortOrder: number;
  promoLabel: string | null;
};

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(MenuSettings)
    private readonly settingsRepository: Repository<MenuSettings>,
    @InjectRepository(MenuProduct)
    private readonly menuProductRepository: Repository<MenuProduct>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductGroup)
    private readonly groupRepository: Repository<ProductGroup>,
  ) {}

  async getSettings(tenantId: string, channel: MenuChannel): Promise<MenuSettings> {
    let settings = await this.settingsRepository.findOne({ where: { tenantId, channel } });
    if (!settings) {
      settings = await this.settingsRepository.save(
        this.settingsRepository.create({
          tenantId,
          channel,
          title: channel === MenuChannel.MESA ? 'Cardápio da mesa' : 'Delivery',
        }),
      );
    }
    return settings;
  }

  async updateSettings(
    tenantId: string,
    channel: MenuChannel,
    dto: UpdateMenuSettingsDto,
  ): Promise<MenuSettings> {
    const settings = await this.getSettings(tenantId, channel);
    if (dto.title) settings.title = dto.title.trim();
    if (dto.welcomeMessage !== undefined) {
      settings.welcomeMessage = dto.welcomeMessage?.trim() ?? null;
    }
    if (dto.active !== undefined) settings.active = dto.active;
    if (dto.serviceFeeEnabled !== undefined) settings.serviceFeeEnabled = dto.serviceFeeEnabled;
    if (dto.serviceFeePercent !== undefined) {
      settings.serviceFeePercent = dto.serviceFeePercent.toFixed(2);
    }
    if (dto.minOrderAmount !== undefined) {
      settings.minOrderAmount = dto.minOrderAmount.toFixed(2);
    }
    if (dto.estimatedMinutes !== undefined) settings.estimatedMinutes = dto.estimatedMinutes;
    return this.settingsRepository.save(settings);
  }

  async getCatalog(tenantId: string, channel: MenuChannel) {
    const settings = await this.getSettings(tenantId, channel);
    const products = await this.productRepository.find({
      where: { tenantId, active: true },
      relations: ['group'],
      order: { name: 'ASC' },
    });
    const entries = await this.menuProductRepository.find({
      where: { tenantId, channel },
    });
    const entryMap = new Map(entries.map((e) => [e.productId, e]));

    const catalog: MenuCatalogItem[] = products.map((product, index) => {
      const entry = entryMap.get(product.id) ?? null;
      return {
        product,
        entry,
        visible: entry?.visible ?? true,
        featured: entry?.featured ?? false,
        sortOrder: entry?.sortOrder ?? index,
        promoLabel: entry?.promoLabel ?? null,
      };
    });

    const visible = catalog
      .filter((c) => c.visible)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const groups = await this.groupRepository.find({
      where: { tenantId, active: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });

    return { settings, groups, catalog, visible };
  }

  async syncProducts(tenantId: string, dto: SyncMenuProductsDto): Promise<MenuProduct[]> {
    const saved: MenuProduct[] = [];
    for (const entry of dto.products) {
      let row = await this.menuProductRepository.findOne({
        where: { tenantId, productId: entry.productId, channel: dto.channel },
      });
      if (!row) {
        const product = await this.productRepository.findOne({
          where: { id: entry.productId, tenantId },
        });
        if (!product) throw new NotFoundException(`Produto ${entry.productId} não encontrado`);
        row = this.menuProductRepository.create({
          tenantId,
          productId: entry.productId,
          channel: dto.channel,
        });
      }
      if (entry.visible !== undefined) row.visible = entry.visible;
      if (entry.featured !== undefined) row.featured = entry.featured;
      if (entry.sortOrder !== undefined) row.sortOrder = entry.sortOrder;
      if (entry.promoLabel !== undefined) row.promoLabel = entry.promoLabel;
      saved.push(await this.menuProductRepository.save(row));
    }
    return saved;
  }
}
