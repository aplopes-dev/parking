import { countKitchenReadyItems, hasPendingKitchenItems } from './orderLineUtils';
import { MobileTable } from './smartPosTypes';

/** Mescla mesa atualizada após ação na API (POST/DELETE). */
export function mergeTableIntoList(prev: MobileTable[], updated: MobileTable): MobileTable[] {
  return prev.map((t) => (t.id === updated.id ? updated : t));
}

function sessionScore(table: MobileTable): {
  lineCount: number;
  pendingCount: number;
  readyCount: number;
} {
  const lines = table.session?.orderLines ?? [];
  return {
    lineCount: lines.length,
    pendingCount: lines.filter((l) => l.status === 'pending').length,
    readyCount: countKitchenReadyItems(lines),
  };
}

function isFreedTable(table: MobileTable): boolean {
  return table.status === 'free' && !table.session;
}

/**
 * Evita que um snapshot WebSocket atrasado sobrescreva a comanda após add item / enviar cozinha / pronto KDS.
 * Prefere mais linhas; em empate, menos pendentes ou mais itens prontos na cozinha.
 * Mesa liberada (livre, sem sessão) sempre prevalece sobre snapshot com comanda antiga.
 */
export function isTableStateNewer(candidate: MobileTable, baseline: MobileTable): boolean {
  if (isFreedTable(candidate) && !isFreedTable(baseline)) {
    return true;
  }
  if (isFreedTable(baseline) && !isFreedTable(candidate)) {
    if (candidate.status === 'open' || candidate.status === 'payment_pending') {
      return true;
    }
    return false;
  }

  const candidateOrderId = candidate.session?.orderId;
  const baselineOrderId = baseline.session?.orderId;
  if (candidateOrderId !== baselineOrderId) {
    if (!baselineOrderId && candidateOrderId && candidate.status !== 'free') {
      return true;
    }
    if (baselineOrderId && !candidateOrderId && isFreedTable(candidate)) {
      return true;
    }
    if (isFreedTable(baseline) && candidateOrderId) {
      return true;
    }
    return false;
  }

  if (baseline.status === 'free' && candidate.status !== 'free') {
    return true;
  }
  if (baseline.status !== 'free' && candidate.status === 'free') {
    return false;
  }

  const a = sessionScore(candidate);
  const b = sessionScore(baseline);
  if (a.lineCount !== b.lineCount) return a.lineCount > b.lineCount;
  if (a.pendingCount !== b.pendingCount) return a.pendingCount < b.pendingCount;
  if (a.readyCount !== b.readyCount) return a.readyCount > b.readyCount;
  return false;
}

/** Mescla uma mesa: mudança de status ou de comanda sempre vem do servidor. */
export function mergeTablePair(existing: MobileTable, incoming: MobileTable): MobileTable {
  if (existing.status !== incoming.status) {
    return incoming;
  }
  if (existing.session?.orderId !== incoming.session?.orderId) {
    return incoming;
  }

  const ex = sessionScore(existing);
  const inc = sessionScore(incoming);
  if (inc.pendingCount < ex.pendingCount) {
    return incoming;
  }
  if (inc.pendingCount > ex.pendingCount) {
    return existing;
  }

  if (isTableStateNewer(existing, incoming)) return existing;
  if (isTableStateNewer(incoming, existing)) return incoming;
  return incoming;
}

export function mergeTablesFromRealtime(prev: MobileTable[], incoming: MobileTable[]): MobileTable[] {
  const prevById = new Map(prev.map((t) => [t.id, t]));
  return incoming.map((inc) => {
    const existing = prevById.get(inc.id);
    if (!existing) return inc;
    return mergeTablePair(existing, inc);
  });
}

export function tableHasPendingToSend(table: MobileTable | undefined): boolean {
  if (!table?.session || table.status !== 'open') return false;
  return hasPendingKitchenItems(table.session.orderLines);
}
