export type FinanceMasterTab = 'transactions' | 'accounts' | 'sources' | 'categories' | 'tags';

export const FINANCE_MODULE_LABEL = 'Gestão financeira';

export const FINANCE_TAB_LABELS: Record<FinanceMasterTab, string> = {
  transactions: 'Lançamentos',
  accounts: 'Contas',
  sources: 'Fontes',
  categories: 'Categorias',
  tags: 'Tags',
};

export const FINANCE_TAB_DESCRIPTIONS: Record<FinanceMasterTab, string> = {
  transactions: 'Lançamentos do período, filtros e resumo.',
  accounts: 'Cadastro de contas financeiras (caixa, banco, digital).',
  sources: 'Fontes de receita e despesa.',
  categories: 'Categorias para classificar lançamentos.',
  tags: 'Tags opcionais nos lançamentos.',
};

export const FINANCE_TAB_SEGMENTS: Record<FinanceMasterTab, string> = {
  transactions: 'lancamentos',
  accounts: 'contas-financeiras',
  sources: 'fontes',
  categories: 'categorias',
  tags: 'tags',
};

export const FINANCE_LANCAMENTOS_PATH = `/financeiro/${FINANCE_TAB_SEGMENTS.transactions}`;

export const FINANCE_TAB_PATHS = (Object.keys(FINANCE_TAB_SEGMENTS) as FinanceMasterTab[]).map(
  (tab) => `/financeiro/${FINANCE_TAB_SEGMENTS[tab]}`,
);

export function financePathForTab(tab: FinanceMasterTab): string {
  return `/financeiro/${FINANCE_TAB_SEGMENTS[tab]}`;
}

export function financeTabFromPath(pathname: string): FinanceMasterTab {
  const segment = pathname.replace(/\/+$/, '').split('/').pop() ?? '';
  const entry = (Object.entries(FINANCE_TAB_SEGMENTS) as [FinanceMasterTab, string][]).find(
    ([, path]) => path === segment,
  );
  return entry?.[0] ?? 'transactions';
}

/** Meta para breadcrumb do topo (Layout) e rotas das abas de lançamentos. */
export function getFinanceTabRouteMeta(pathname: string): {
  path: string;
  label: string;
  moduleLabel: string;
} | undefined {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  const tab = financeTabFromPath(normalized);
  const path = financePathForTab(tab);
  if (normalized !== path) return undefined;
  return {
    path,
    label: FINANCE_TAB_LABELS[tab],
    moduleLabel: FINANCE_MODULE_LABEL,
  };
}
