import { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';
import { Product, StockLocation } from '../../types';

export function useStockCatalog() {
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [locRes, prodRes] = await Promise.all([
        api.get<{ data: StockLocation[] }>('/stock-locations', { params: { limit: 100 } }),
        api.get<{ data: Product[] }>('/products', { params: { activeOnly: true, limit: 100 } }),
      ]);
      setLocations(locRes.data.data.filter((l) => l.active));
      setProducts(prodRes.data.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const locationOptions = locations.map((l) => ({
    value: l.id,
    label: l.isDefault ? `${l.name} (padrão)` : l.name,
  }));

  const productOptions = products.map((p) => ({
    value: p.id,
    label: p.sku ? `${p.name} (${p.sku})` : p.name,
  }));

  return { locations, products, loading, load, locationOptions, productOptions };
}
