import { Product } from '../types';
import api from '../services/api';

export const getProductPhotoUrl = (
  product?: Pick<Product, 'id' | 'photoKey' | 'updatedAt'> | null,
): string | null => {
  if (!product?.id || !product.photoKey) {
    return null;
  }

  const baseURL = String(api.defaults.baseURL || '').replace(/\/$/, '');
  const version = encodeURIComponent(
    product.updatedAt ?? product.photoKey,
  );

  return `${baseURL}/public/products/${product.id}/photo?v=${version}`;
};
