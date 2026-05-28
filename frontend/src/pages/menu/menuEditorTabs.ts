export type MenuEditorTab = 'configuracao' | 'produtos' | 'visualizacao';

export const MENU_EDITOR_TAB_LABELS: Record<MenuEditorTab, string> = {
  configuracao: 'Configuração',
  produtos: 'Produtos',
  visualizacao: 'Pré-visualização',
};

export const MENU_EDITOR_TAB_DESCRIPTIONS: Record<MenuEditorTab, string> = {
  configuracao: 'Título, mensagens, taxas e status do canal.',
  produtos: 'Visibilidade, destaque, promoção e ordem dos itens.',
  visualizacao: 'Como o cardápio aparece para o cliente.',
};

const VALID: MenuEditorTab[] = ['configuracao', 'produtos', 'visualizacao'];

export function menuEditorTabFromSearch(search: string): MenuEditorTab {
  const value = new URLSearchParams(search).get('aba');
  if (value && VALID.includes(value as MenuEditorTab)) return value as MenuEditorTab;
  return 'configuracao';
}

export function menuEditorTabHref(pathname: string, tab: MenuEditorTab): string {
  const base = pathname.replace(/\/+$/, '') || '/';
  return `${base}?aba=${tab}`;
}
