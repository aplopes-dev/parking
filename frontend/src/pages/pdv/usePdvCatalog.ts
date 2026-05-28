import { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';
import { Comanda, Customer, Product } from '../../types';
import { PaginatedResponse } from '../../types/pagination';

export function usePdvCatalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [prodRes, custRes, comRes] = await Promise.all([
        api.get<PaginatedResponse<Product>>('/products', { params: { activeOnly: true, limit: 100 } }),
        api.get<PaginatedResponse<Customer>>('/customers', { params: { limit: 100 } }),
        api.get<Comanda[]>('/comandas'),
      ]);
      setProducts(prodRes.data.data);
      setCustomers(custRes.data.data);
      setComandas(comRes.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const productOptions = products.map((p) => ({
    value: p.id,
    label: `${p.name} — ${Number(p.salePrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
  }));

  const customerOptions = customers.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  const comandaOptions = comandas.map((c) => ({
    value: c.id,
    label: `#${c.number}${c.label ? ` — ${c.label}` : ''} (${c.status})`,
  }));

  return { products, customers, comandas, productOptions, customerOptions, comandaOptions, loading, reload };
}
