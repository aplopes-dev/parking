import { MobileMenuItem } from './smartPosTypes';

export type MenuPromoPriceDto = {
  price: number;
  originalPrice: number;
  campaignName: string;
  promoLabel: string;
};

export function applyPromoPricesToMenuItems(
  items: MobileMenuItem[],
  promos: Record<string, MenuPromoPriceDto>,
): MobileMenuItem[] {
  if (!Object.keys(promos).length) return items;

  return items.map((item) => {
    const promo = promos[item.id];
    if (!promo || promo.price >= promo.originalPrice) return item;
    return {
      ...item,
      price: promo.price,
      originalPrice: promo.originalPrice,
      promoLabel: promo.promoLabel,
    };
  });
}
