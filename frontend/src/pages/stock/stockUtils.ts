import { ProductUnit, StockMovementType } from '../../types';

export const formatQty = (value: string | number): string => {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  return Number.isFinite(n) ? n.toLocaleString('pt-BR', { maximumFractionDigits: 4 }) : '0';
};

export const movementTypeLabel = (type: StockMovementType): string => {
  switch (type) {
    case 'entrada':
      return 'Entrada';
    case 'saida':
      return 'Saída';
    case 'acerto':
      return 'Acerto';
    case 'producao_entrada':
      return 'Produção (entrada)';
    case 'producao_saida':
      return 'Produção (saída)';
    default:
      return type;
  }
};

export const unitLabel = (unit: ProductUnit): string => {
  const map: Record<ProductUnit, string> = {
    un: 'Un',
    kg: 'Kg',
    l: 'L',
    porcao: 'Porção',
  };
  return map[unit] || unit;
};
