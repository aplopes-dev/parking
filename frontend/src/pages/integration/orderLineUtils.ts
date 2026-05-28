import { MobileOrderLine } from './smartPosTypes';

export type DisplayOrderLine = {
  /** productId ou nome do produto */
  key: string;
  productId: string | null;
  productName: string;
  quantity: number;
  total: number;
  /** IDs das linhas no pedido (para remoção de uma unidade) */
  lineIds: string[];
};

function lineGroupKey(line: MobileOrderLine): string {
  return line.productId ?? line.productName;
}

/** Agrupa linhas repetidas do mesmo produto em uma entrada com quantidade somada. */
export function groupOrderLines(lines: MobileOrderLine[]): DisplayOrderLine[] {
  const map = new Map<string, DisplayOrderLine>();

  for (const line of lines) {
    const key = lineGroupKey(line);
    const existing = map.get(key);
    if (existing) {
      existing.quantity += line.quantity;
      existing.total += line.total;
      existing.lineIds.push(line.id);
    } else {
      map.set(key, {
        key,
        productId: line.productId ?? null,
        productName: line.productName,
        quantity: line.quantity,
        total: line.total,
        lineIds: [line.id],
      });
    }
  }

  return Array.from(map.values());
}

/** Remove uma unidade: última linha lançada do grupo (LIFO). */
export function pickLineIdToRemove(group: DisplayOrderLine): string {
  return group.lineIds[group.lineIds.length - 1];
}

/** Item marcado como pronto na cozinha (aguardando retirada no salão). */
export const KITCHEN_READY_LINE_STATUS = 'delivered';

/** Há itens ainda não enviados à cozinha/produção. */
export function hasPendingKitchenItems(lines: MobileOrderLine[]): boolean {
  return lines.some((line) => line.status === 'pending');
}

/** Cozinha despachou — itens prontos para o garçom retirar. */
export function hasKitchenReadyItems(lines: MobileOrderLine[]): boolean {
  return lines.some((line) => line.status === KITCHEN_READY_LINE_STATUS);
}

/** Quantidade de unidades prontas na cozinha (soma das linhas despachadas). */
export function countKitchenReadyItems(lines: MobileOrderLine[]): number {
  return lines
    .filter((line) => line.status === KITCHEN_READY_LINE_STATUS)
    .reduce((sum, line) => sum + line.quantity, 0);
}
