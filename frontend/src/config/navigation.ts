/** Estrutura de módulos inspirada em https://sischef.com/recursos-funcionalidades/ */

import { getFinanceTabRouteMeta } from '../pages/finance/financeTabRoutes';
import { AppUserRole, roleMatchesAllowed } from '../types/userRole';

export type NavUserRole = AppUserRole;

export type NavLeaf = {
  type: 'leaf';
  id: string;
  label: string;
  path: string;
  description?: string;
  roles?: NavUserRole[];
};

export type NavGroup = {
  type: 'group';
  id: string;
  label: string;
  children: NavItem[];
  roles?: NavUserRole[];
};

export type NavItem = NavLeaf | NavGroup;

export type NavModule = {
  id: string;
  label: string;
  icon: string;
  children: NavItem[];
  roles?: NavUserRole[];
};

export const APP_BRAND = {
  name: 'Aplopes Estacionamento',
  shortName: 'Estacionamento',
  tagline: 'Gestão de estacionamentos',
};

export const navigationModules: NavModule[] = [
  {
    id: 'dashboard',
    label: 'Início',
    icon: '⌂',
    roles: ['admin', 'manager', 'garcom', 'developer', 'hr'],
    children: [
      {
        type: 'leaf',
        id: 'painel',
        label: 'Painel geral',
        path: '/',
        description: 'Ocupação, movimentação e indicadores do estacionamento.',
        roles: ['admin', 'manager', 'garcom', 'developer', 'hr', 'cozinha'],
      },
    ],
  },
  {
    id: 'operacao',
    label: 'Operação',
    icon: 'P',
    roles: ['admin', 'manager', 'garcom', 'developer'],
    children: [
      {
        type: 'leaf',
        id: 'entrada-saida',
        label: 'Entrada e saída',
        path: '/operacao/entrada-saida',
        description: 'Registre entrada de veículos e libere saídas do pátio.',
      },
      {
        type: 'leaf',
        id: 'caixa',
        label: 'Caixa — cobrança na saída',
        path: '/operacao/caixa',
        description: 'Receba pagamentos e registre lançamentos no financeiro.',
      },
      {
        type: 'leaf',
        id: 'sessoes',
        label: 'Histórico de sessões',
        path: '/operacao/sessoes',
        description: 'Consulte tickets, placas e tempo de permanência.',
      },
    ],
  },
  {
    id: 'estacionamento',
    label: 'Estacionamento',
    icon: '▣',
    roles: ['admin', 'manager', 'hr'],
    children: [
      {
        type: 'leaf',
        id: 'unidades',
        label: 'Unidades e configuração',
        path: '/estacionamento/unidades',
        description: 'Valet, garagem ou estacionamento público por segmento.',
      },
      {
        type: 'leaf',
        id: 'vagas',
        label: 'Vagas',
        path: '/estacionamento/vagas',
        description: 'Cadastro e status das vagas por unidade.',
      },
      {
        type: 'leaf',
        id: 'tarifas',
        label: 'Tarifas e tabelas',
        path: '/estacionamento/tarifas',
        description: 'Horários, faixas e valores de cobrança.',
      },
      {
        type: 'leaf',
        id: 'mensalistas',
        label: 'Mensalistas e convênios',
        path: '/estacionamento/mensalistas',
        description: 'Contratos, credenciais e convênios corporativos.',
      },
      {
        type: 'leaf',
        id: 'cobranca-mensal',
        label: 'Cobrança mensal',
        path: '/estacionamento/cobranca',
        description: 'Faturamento de mensalistas e contas a receber.',
      },
      {
        type: 'leaf',
        id: 'valet',
        label: 'Valet Parking',
        path: '/estacionamento/valet',
        description: 'Operação de manobristas, fila e entrega de veículos.',
      },
    ],
  },
  {
    id: 'cadastros',
    label: 'Cadastros',
    icon: '▦',
    roles: ['admin', 'manager', 'hr'],
    children: [
      {
        type: 'leaf',
        id: 'clientes',
        label: 'Clientes e mensalistas',
        path: '/cadastros/clientes',
        description: 'Cadastro de clientes, empresas e convênios.',
      },
      {
        type: 'leaf',
        id: 'veiculos',
        label: 'Veículos',
        path: '/cadastros/veiculos',
        description: 'Placas recorrentes, tags RFID e veículos autorizados.',
      },
    ],
  },
  {
    id: 'financeiro',
    label: 'Gestão financeira',
    icon: '₿',
    roles: ['admin', 'manager', 'hr'],
    children: [
      {
        type: 'group',
        id: 'fin-operacao',
        label: 'Operação financeira',
        children: [
          {
            type: 'leaf',
            id: 'lancamentos',
            label: 'Lançamentos',
            path: '/financeiro/lancamentos',
          },
          {
            type: 'leaf',
            id: 'folha',
            label: 'Folha de pagamento',
            path: '/financeiro/folha',
          },
          {
            type: 'leaf',
            id: 'contas-pagar-receber',
            label: 'Contas a pagar e receber',
            path: '/financeiro/contas',
          },
          {
            type: 'leaf',
            id: 'baixa-contas',
            label: 'Baixa por pessoa e período',
            path: '/financeiro/baixa-contas',
          },
          {
            type: 'leaf',
            id: 'transferencias',
            label: 'Transferência entre contas',
            path: '/financeiro/transferencias',
          },
          {
            type: 'leaf',
            id: 'calendario',
            label: 'Listagem por data',
            path: '/financeiro/calendario',
          },
          {
            type: 'leaf',
            id: 'recorrentes',
            label: 'Receitas e despesas recorrentes',
            path: '/financeiro/recorrentes',
          },
          {
            type: 'leaf',
            id: 'adiantamento',
            label: 'Adiantamento',
            path: '/financeiro/adiantamento',
          },
          {
            type: 'leaf',
            id: 'extrato',
            label: 'Extrato de caixa e bancos',
            path: '/financeiro/extrato',
          },
          { type: 'leaf', id: 'recibos', label: 'Geração de recibos', path: '/financeiro/recibos' },
          {
            type: 'leaf',
            id: 'conferencia-diaria',
            label: 'Conferência diária',
            path: '/financeiro/conferencia-diaria',
          },
          {
            type: 'leaf',
            id: 'caixas',
            label: 'Conferência e gestão de caixas',
            path: '/financeiro/caixas',
          },
          { type: 'leaf', id: 'dre', label: 'Resumo financeiro (DRE)', path: '/financeiro/dre' },
          { type: 'leaf', id: 'drc', label: 'Fluxo de caixa (DRC)', path: '/financeiro/drc' },
          {
            type: 'leaf',
            id: 'cartao',
            label: 'Gestão de cartão',
            path: '/financeiro/cartao',
          },
          {
            type: 'leaf',
            id: 'conciliacao',
            label: 'Conciliação bancária',
            path: '/financeiro/conciliacao',
          },
          {
            type: 'leaf',
            id: 'credito-prepago',
            label: 'Crédito pré-pago',
            path: '/financeiro/credito-prepago',
          },
        ],
      },
    ],
  },
  {
    id: 'estoque',
    label: 'Estoque',
    icon: '▤',
    roles: ['admin', 'manager', 'hr'],
    children: [
      { type: 'leaf', id: 'acerto', label: 'Acerto de estoque', path: '/estoque/acerto' },
      { type: 'leaf', id: 'entrada-saida', label: 'Entrada e saída manual', path: '/estoque/entrada-saida' },
      { type: 'leaf', id: 'locais', label: 'Locais de estoque', path: '/estoque/locais' },
      { type: 'leaf', id: 'minimo', label: 'Estoque mínimo', path: '/estoque/minimo' },
    ],
  },
  {
    id: 'fiscal',
    label: 'Fiscal',
    icon: '▣',
    roles: ['admin', 'manager'],
    children: [
      { type: 'leaf', id: 'pedidos-venda-compra', label: 'Pedidos de venda e compra', path: '/fiscal/pedidos' },
      { type: 'leaf', id: 'devolucoes', label: 'Devolução de compra e venda', path: '/fiscal/devolucoes' },
      { type: 'leaf', id: 'listagem-pedidos', label: 'Listagem de pedidos', path: '/fiscal/listagem' },
      { type: 'leaf', id: 'notas', label: 'Notas emitidas e recebidas', path: '/fiscal/notas' },
      { type: 'leaf', id: 'importacao', label: 'Importação de notas (XML/SEFAZ)', path: '/fiscal/importacao' },
      { type: 'leaf', id: 'emissao', label: 'Emissão NF-e / NFC-e', path: '/fiscal/emissao' },
      { type: 'leaf', id: 'cancelamento', label: 'Cancelar NF-e / NFC-e', path: '/fiscal/cancelamento' },
      { type: 'leaf', id: 'inutilizacao', label: 'Inutilização de notas', path: '/fiscal/inutilizacao' },
      { type: 'leaf', id: 'contador', label: 'Usuário contador', path: '/fiscal/contador' },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: '◔',
    children: [
      { type: 'leaf', id: 'tempo-real', label: 'Análise em tempo real', path: '/analytics/tempo-real' },
      { type: 'leaf', id: 'indicadores', label: 'Indicadores visuais', path: '/analytics/indicadores' },
      { type: 'leaf', id: 'acesso-online', label: 'Acesso online', path: '/analytics/acesso-online' },
    ],
  },
  {
    id: 'crm',
    label: 'CRM',
    icon: '♡',
    roles: ['admin', 'manager', 'hr'],
    children: [
      { type: 'leaf', id: 'clientes-crm', label: 'Base de clientes', path: '/crm/clientes' },
      { type: 'leaf', id: 'campanhas', label: 'Campanhas e ofertas', path: '/crm/campanhas' },
      { type: 'leaf', id: 'fidelidade', label: 'Programa de fidelidade', path: '/crm/fidelidade' },
    ],
  },
  {
    id: 'integracoes',
    label: 'Integrações',
    icon: '⇄',
    children: [
      {
        type: 'group',
        id: 'pagamentos',
        label: 'Pagamentos',
        roles: ['admin', 'manager'],
        children: [
          {
            type: 'leaf',
            id: 'pagbank',
            label: 'PagBank',
            path: '/pagamentos/configuracao',
            description:
              'Split PagBank, credenciais e recebedores quando a Aplopes atua como adquirente.',
            roles: ['admin', 'manager'],
          },
        ],
      },
      {
        type: 'leaf',
        id: 'catracas',
        label: 'Catracas e cancelas',
        path: '/integracoes/catracas',
        description: 'Integração com hardware de acesso ao estacionamento.',
      },
      {
        type: 'leaf',
        id: 'whatsapp',
        label: 'Notificação via WhatsApp',
        path: '/integracoes/whatsapp',
      },
      {
        type: 'leaf',
        id: 'cameras',
        label: 'LPR / OCR de placas',
        path: '/integracoes/lpr',
        description: 'Reconhecimento automático de placas na entrada e saída.',
      },
    ],
  },
  {
    id: 'multilojas',
    label: 'Redes e unidades',
    icon: '⬡',
    roles: ['admin', 'manager'],
    children: [
      { type: 'leaf', id: 'unidades', label: 'Redes e franquias', path: '/multilojas/unidades' },
      { type: 'leaf', id: 'relatorios-unificados', label: 'Relatórios unificados', path: '/multilojas/relatorios' },
    ],
  },
  {
    id: 'relatorios',
    label: 'Relatórios',
    icon: '▥',
    children: [
      {
        type: 'leaf',
        id: 'relatorios-gerais',
        label: 'Relatórios gerais',
        path: '/relatorios',
        roles: ['admin', 'manager', 'hr'],
      },
      { type: 'leaf', id: 'relatorios-estacionamento', label: 'Relatórios de estacionamento', path: '/relatorios/estacionamento', roles: ['admin', 'manager', 'hr'] },
      { type: 'leaf', id: 'vendas', label: 'Relatórios operacionais', path: '/relatorios/vendas' },
      { type: 'leaf', id: 'estoque-relatorio', label: 'Relatórios de estoque', path: '/relatorios/estoque' },
      { type: 'leaf', id: 'financeiro-relatorio', label: 'Relatórios financeiros', path: '/relatorios/financeiro' },
    ],
  },
  {
    id: 'sistema',
    label: 'Sistema',
    icon: '⚙',
    roles: ['admin', 'manager', 'developer', 'hr'],
    children: [
      {
        type: 'leaf',
        id: 'usuarios',
        label: 'Usuários',
        path: '/usuarios',
        roles: ['admin', 'hr'],
      },
      {
        type: 'leaf',
        id: 'meu-perfil',
        label: 'Meu perfil',
        path: '/meu-perfil',
      },
      { type: 'leaf', id: 'suporte', label: 'Suporte técnico', path: '/sistema/suporte' },
    ],
  },
];

export type FlatNavRoute = {
  path: string;
  label: string;
  moduleLabel: string;
  description?: string;
  roles?: NavUserRole[];
};

function flattenItems(
  items: NavItem[],
  moduleLabel: string,
  acc: FlatNavRoute[],
): void {
  for (const item of items) {
    if (item.type === 'leaf') {
      acc.push({
        path: item.path,
        label: item.label,
        moduleLabel,
        description: item.description,
        roles: item.roles,
      });
    } else {
      flattenItems(item.children, moduleLabel, acc);
    }
  }
}

export function getFlatRoutes(): FlatNavRoute[] {
  const acc: FlatNavRoute[] = [];
  for (const mod of navigationModules) {
    flattenItems(mod.children, mod.label, acc);
  }
  return acc;
}

/** Primeira rota folha do módulo (breadcrumb “voltar” ao módulo). */
export function findModuleRootPath(moduleLabel: string): string | undefined {
  const mod = navigationModules.find((m) => m.label === moduleLabel);
  if (!mod) return undefined;

  const walk = (items: NavItem[]): string | undefined => {
    for (const item of items) {
      if (item.type === 'leaf') return item.path;
      const nested = walk(item.children);
      if (nested) return nested;
    }
    return undefined;
  };

  return walk(mod.children);
}

export function findRouteMeta(pathname: string): FlatNavRoute | undefined {
  const financeTab = getFinanceTabRouteMeta(pathname);
  if (financeTab) return financeTab;

  const flat = getFlatRoutes();
  const exact = flat.find((r) => r.path === pathname);
  if (exact) return exact;
  const sorted = [...flat].sort((a, b) => b.path.length - a.path.length);
  return sorted.find((r) => r.path !== '/' && pathname.startsWith(`${r.path}/`));
}

function itemAllowed(roles: NavUserRole[] | undefined, userRole?: string): boolean {
  if (!roles?.length) return true;
  return roleMatchesAllowed(userRole, roles);
}

function filterItems(items: NavItem[], userRole?: string): NavItem[] {
  return items
    .map((item) => {
      if (item.type === 'leaf') {
        return itemAllowed(item.roles, userRole) ? item : null;
      }
      if (!itemAllowed(item.roles, userRole)) return null;
      const children = filterItems(item.children, userRole);
      if (!children.length) return null;
      return { ...item, children };
    })
    .filter((x): x is NavItem => x !== null);
}

export function getNavigationForRole(userRole?: string): NavModule[] {
  return navigationModules
    .map((mod) => {
      if (!itemAllowed(mod.roles, userRole)) return null;
      const children = filterItems(mod.children, userRole);
      if (!children.length) return null;
      return { ...mod, children };
    })
    .filter((x): x is NavModule => x !== null);
}
