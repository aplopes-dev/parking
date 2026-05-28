import api from '../services/api';

/** Utilitários para listagens em painel (arrastar, ordenar). */

export type SortableItem = {
  id: string;
  sortOrder?: number;
  name?: string;
};

export function sortBySortOrder<T extends SortableItem>(list: T[]): T[] {
  return [...list].sort(
    (a, b) =>
      (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
      (a.name ?? '').localeCompare(b.name ?? '', 'pt-BR'),
  );
}

export function reorderById<T extends SortableItem>(
  list: T[],
  fromId: string,
  toId: string,
): T[] {
  if (fromId === toId) return list;
  const fromIndex = list.findIndex((i) => i.id === fromId);
  const toIndex = list.findIndex((i) => i.id === toId);
  if (fromIndex < 0 || toIndex < 0) return list;
  const next = [...list];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next.map((item, index) => ({ ...item, sortOrder: index }));
}

/** Persiste ordem via rota dedicada (evita validação do PATCH completo). */
export async function persistSortOrder(
  resourcePath: string,
  items: SortableItem[],
): Promise<void> {
  await Promise.all(
    items.map((item, index) =>
      api.patch(`${resourcePath}/${item.id}/sort-order`, { sortOrder: index }),
    ),
  );
}
