/**
 * Catálogo de fluxos PagBank (API Platform).
 * Referência: https://developer.pagbank.com.br/reference/introducao
 */
export type PagbankFlowCategory =
  | 'orders'
  | 'split'
  | 'connect'
  | 'checkout'
  | 'recurring'
  | 'transfer'
  | 'registration'
  | 'security'
  | 'complementary';

/** Fluxos com código no backend (Fases 1–2). */
export const PAGBANK_IMPLEMENTED_IN_CODE = new Set<string>([
  // Fase 1
  'orders_create',
  'orders_create_and_pay',
  'orders_pix',
  'orders_credit_card',
  'orders_debit_card',
  'orders_boleto',
  'orders_cancel',
  'orders_capture',
  'split_payment',
  'split_create_then_pay',
  'split_create_and_pay',
  'split_query',
  'webhooks_orders',
  // Fase 2 — cartões avançados e carteiras
  'orders_token_pagbank',
  'orders_token_card_brand',
  'orders_3ds_pagbank',
  'orders_3ds_external',
  'orders_pci_card',
  'orders_fee_pass_through',
  'orders_pagbank_qr',
  'orders_pagbank_deeplink',
  'orders_google_pay',
  'orders_apple_pay',
  'orders_card_vault',
  'orders_recurrence_hint',
  'orders_elo_recurrence',
  'orders_sdwo',
  // Fase 3 — split avançado
  'split_custody',
  'split_pix',
  'split_preauth_partial',
  'split_release_custody',
  'split_cancel',
  'split_chargeback_recovery',
  'split_liable_mcc',
  // Fase 4 — Connect
  'connect_app',
  'connect_authorization',
  'connect_sms',
  'connect_token',
  // Fase 5 — Checkout hospedado
  'checkout_pagbank',
  'webhooks_checkout',
  // Fase 6 — Recorrente
  'recurring_plans',
  'recurring_subscriptions',
  // Fase 7 — Transferência e cadastro
  'transfer_balance',
  'account_register',
]);

export function getPagbankFlowCatalog(): PagbankFlowDefinition[] {
  return PAGBANK_FLOW_CATALOG.map((flow) => ({
    ...flow,
    implemented: PAGBANK_IMPLEMENTED_IN_CODE.has(flow.id),
  }));
}

export type PagbankFlowDefinition = {
  id: string;
  category: PagbankFlowCategory;
  label: string;
  description: string;
  docUrl: string;
  /** Indica se o backend Aplopes Food já possui integração de código para este fluxo */
  implemented: boolean;
  /** Campos extras opcionais na configuração (além de enabled) */
  optionFields?: Array<{
    key: string;
    label: string;
    type: 'text' | 'url' | 'number' | 'boolean';
    placeholder?: string;
  }>;
};

export const PAGBANK_FLOW_CATALOG: PagbankFlowDefinition[] = [
  // --- API de Pedidos (Order) ---
  {
    id: 'orders_create',
    category: 'orders',
    label: 'Criar pedido',
    description: 'Cria pedido sem pagamento imediato; pagar depois via POST /orders/{id}/pay.',
    docUrl: 'https://developer.pagbank.com.br/reference/criar-pedido',
    implemented: false,
  },
  {
    id: 'orders_create_and_pay',
    category: 'orders',
    label: 'Criar e pagar pedido',
    description: 'Pedido com cobrança na mesma requisição.',
    docUrl: 'https://developer.pagbank.com.br/reference/criar-e-pagar-pedido-com-cartao',
    implemented: false,
  },
  {
    id: 'orders_pix',
    category: 'orders',
    label: 'PIX (QR Code)',
    description: 'Pedido com QR Code PIX na API Orders.',
    docUrl: 'https://developer.pagbank.com.br/reference/criar-pedido-com-qr-code-pix',
    implemented: false,
  },
  {
    id: 'orders_credit_card',
    category: 'orders',
    label: 'Cartão de crédito',
    description: 'Pagamento com cartão de crédito (facilitador/adquirente).',
    docUrl: 'https://developer.pagbank.com.br/reference/criar-pedido-com-cartao-facilitadores-de-pagamento',
    implemented: false,
  },
  {
    id: 'orders_debit_card',
    category: 'orders',
    label: 'Cartão de débito',
    description: 'Pagamento com cartão de débito.',
    docUrl: 'https://developer.pagbank.com.br/reference/criar-e-pagar-pedido-com-cartao',
    implemented: false,
  },
  {
    id: 'orders_boleto',
    category: 'orders',
    label: 'Boleto',
    description: 'Emissão e pagamento via boleto bancário.',
    docUrl: 'https://developer.pagbank.com.br/reference/criar-e-pagar-pedido-com-boleto',
    implemented: false,
  },
  {
    id: 'orders_pagbank_qr',
    category: 'orders',
    label: 'Pagar com PagBank (QR Code)',
    description: 'Checkout com QR Code da carteira PagBank.',
    docUrl: 'https://developer.pagbank.com.br/reference/criar-pedido-com-pagar-com-pagbank-qr-code',
    implemented: false,
  },
  {
    id: 'orders_pagbank_deeplink',
    category: 'orders',
    label: 'Pagar com PagBank (Deeplink)',
    description: 'Redireciona o comprador ao app PagBank via deeplink.',
    docUrl: 'https://developer.pagbank.com.br/reference/criar-pedido-com-pagar-com-pagbank-deeplink',
    implemented: false,
  },
  {
    id: 'orders_fee_pass_through',
    category: 'orders',
    label: 'Repasse de taxa ao comprador',
    description: 'Repassa taxas de parcelamento/juros ao cliente final.',
    docUrl: 'https://developer.pagbank.com.br/reference/criar-pedido-com-repasse-de-taxa-ao-comprador',
    implemented: false,
  },
  {
    id: 'orders_pci_card',
    category: 'orders',
    label: 'Cartão (PCI no cliente)',
    description: 'Dados de cartão tratados no ambiente PCI do estabelecimento.',
    docUrl: 'https://developer.pagbank.com.br/reference/criar-e-pagar-pedido-com-cartao-clientes-pci',
    implemented: false,
  },
  {
    id: 'orders_token_pagbank',
    category: 'orders',
    label: 'Token PagBank',
    description: 'Cartão tokenizado e armazenado no PagBank.',
    docUrl: 'https://developer.pagbank.com.br/reference/criar-e-pagar-pedido-com-token-pagbank',
    implemented: false,
  },
  {
    id: 'orders_token_card_brand',
    category: 'orders',
    label: 'Token de bandeira',
    description: 'Pagamento com token da bandeira (network token).',
    docUrl: 'https://developer.pagbank.com.br/reference/criar-e-pagar-pedido-com-token-de-bandeira',
    implemented: false,
  },
  {
    id: 'orders_recurrence_hint',
    category: 'orders',
    label: 'Indicação de recorrência',
    description: 'Marca pedido com indicação de cobrança recorrente futura.',
    docUrl: 'https://developer.pagbank.com.br/reference/criar-e-pagar-pedido-com-indicacao-de-recorrencia',
    implemented: false,
  },
  {
    id: 'orders_3ds_pagbank',
    category: 'orders',
    label: '3DS PagBank',
    description: 'Autenticação 3DS gerenciada pelo PagBank.',
    docUrl: 'https://developer.pagbank.com.br/reference/criar-e-pagar-com-autenticacao-3ds-do-pagbank',
    implemented: false,
  },
  {
    id: 'orders_3ds_external',
    category: 'orders',
    label: '3DS externo',
    description: 'Autenticação 3DS realizada fora do PagBank.',
    docUrl: 'https://developer.pagbank.com.br/reference/criar-e-pagar-com-autenticacao-3ds-externa',
    implemented: false,
  },
  {
    id: 'orders_sdwo',
    category: 'orders',
    label: 'SDWO',
    description: 'Fluxo SDWO (carteira digital / arranjo específico PagBank).',
    docUrl: 'https://developer.pagbank.com.br/reference/criar-e-pagar-com-sdwo',
    implemented: false,
  },
  {
    id: 'orders_google_pay',
    category: 'orders',
    label: 'Google Pay',
    description: 'Pagamento via Google Pay integrado ao PagBank.',
    docUrl: 'https://developer.pagbank.com.br/reference/criar-e-pagar-pedido-com-google-pay',
    implemented: false,
  },
  {
    id: 'orders_apple_pay',
    category: 'orders',
    label: 'Apple Pay',
    description: 'Pagamento via Apple Pay.',
    docUrl: 'https://developer.pagbank.com.br/reference/criar-e-pagar-um-pedido-com-apple-pay',
    implemented: false,
  },
  {
    id: 'orders_elo_recurrence',
    category: 'orders',
    label: 'Recorrência Elo',
    description: 'Pedidos com identificação de recorrência Elo.',
    docUrl: 'https://developer.pagbank.com.br/reference/criar-e-pagar-pedidos-com-identificacao-de-recorrencia-elo',
    implemented: false,
  },
  {
    id: 'orders_capture',
    category: 'orders',
    label: 'Captura de pagamento',
    description: 'Captura total ou parcial de pré-autorização.',
    docUrl: 'https://developer.pagbank.com.br/reference/capturar-pagamento',
    implemented: false,
  },
  {
    id: 'orders_cancel',
    category: 'orders',
    label: 'Cancelamento',
    description: 'Cancelamento de cobrança/pedido.',
    docUrl: 'https://developer.pagbank.com.br/reference/cancelar-pagamento',
    implemented: false,
  },
  {
    id: 'orders_card_vault',
    category: 'orders',
    label: 'Validar e armazenar cartão',
    description: 'Vault de cartão no PagBank para cobranças futuras.',
    docUrl: 'https://developer.pagbank.com.br/reference/validar-e-armazenar-um-cartao-no-pagbank',
    implemented: false,
  },
  // --- Divisão de pagamento ---
  {
    id: 'split_payment',
    category: 'split',
    label: 'Divisão de pagamento (split)',
    description: 'Distribui valor entre recebedores (marketplace). Configurado na aba Split.',
    docUrl: 'https://developer.pagbank.com.br/reference/divisao-de-pagamento',
    implemented: false,
  },
  {
    id: 'split_create_then_pay',
    category: 'split',
    label: 'Split: criar e depois pagar',
    description: 'Cria pedido e aplica split no momento do pagamento.',
    docUrl: 'https://developer.pagbank.com.br/reference/crie-e-depois-pague-o-pedido-com-divisao-do-pagamento',
    implemented: false,
  },
  {
    id: 'split_create_and_pay',
    category: 'split',
    label: 'Split: criar e pagar',
    description: 'Pedido com split na criação e pagamento simultâneos.',
    docUrl: 'https://developer.pagbank.com.br/reference/crie-e-pague-um-pedido-com-divisao-do-pagamento',
    implemented: false,
  },
  {
    id: 'split_custody',
    category: 'split',
    label: 'Split com custódia',
    description: 'Retém valores até liberação manual (custódia).',
    docUrl: 'https://developer.pagbank.com.br/reference/crie-e-pague-um-pedido-com-custodia',
    implemented: false,
  },
  {
    id: 'split_pix',
    category: 'split',
    label: 'Split com PIX',
    description: 'Divisão de pagamento em transações PIX.',
    docUrl: 'https://developer.pagbank.com.br/reference/pedido-com-divisao-de-pagamento-com-pix',
    implemented: false,
  },
  {
    id: 'split_preauth_partial',
    category: 'split',
    label: 'Split: pré-auth e captura parcial',
    description: 'Pré-autorização com captura parcial e split.',
    docUrl:
      'https://developer.pagbank.com.br/reference/pre-autorizar-e-capturar-parcialmente-um-pedido-com-divisao-do-pagamento',
    implemented: false,
  },
  {
    id: 'split_query',
    category: 'split',
    label: 'Consultar divisão',
    description: 'Consulta status da divisão após o pagamento.',
    docUrl: 'https://developer.pagbank.com.br/reference/consulte-a-divisao-do-pagamento',
    implemented: false,
  },
  {
    id: 'split_release_custody',
    category: 'split',
    label: 'Liberar split em custódia',
    description: 'Libera valores retidos em custódia para recebedores.',
    docUrl: 'https://developer.pagbank.com.br/reference/liberar-divisao-de-pagamento-com-custodia',
    implemented: false,
  },
  {
    id: 'split_cancel',
    category: 'split',
    label: 'Cancelar pedido com split',
    description: 'Cancelamento de pedido que utilizou divisão.',
    docUrl: 'https://developer.pagbank.com.br/reference/cancelamento-de-pedido-com-divisao-de-pagamento',
    implemented: false,
  },
  {
    id: 'split_chargeback_recovery',
    category: 'split',
    label: 'Recuperação chargeback secundário',
    description: 'Recuperação de chargeback de recebedor secundário.',
    docUrl: 'https://developer.pagbank.com.br/reference/recuperacao-de-chargeback-de-um-secundario',
    implemented: false,
  },
  {
    id: 'split_liable_mcc',
    category: 'split',
    label: 'MCC do vendedor liable',
    description: 'Utiliza MCC do vendedor principal (liable) na transação.',
    docUrl:
      'https://developer.pagbank.com.br/reference/como-utilizar-o-mcc-do-vendedor-principal-na-transacao-liable',
    implemented: false,
  },
  // --- Connect ---
  {
    id: 'connect_app',
    category: 'connect',
    label: 'Connect — aplicação OAuth',
    description: 'Conectar contas de usuários PagBank (marketplace/plataforma).',
    docUrl: 'https://developer.pagbank.com.br/reference/criar-aplicacao',
    implemented: false,
    optionFields: [
      { key: 'clientId', label: 'Client ID', type: 'text' },
      { key: 'redirectUri', label: 'Redirect URI', type: 'url' },
    ],
  },
  {
    id: 'connect_authorization',
    category: 'connect',
    label: 'Connect — autorização',
    description: 'Fluxo de autorização Connect Authorization.',
    docUrl: 'https://developer.pagbank.com.br/reference/solicitar-autorizacao-via-connect-authorization',
    implemented: false,
  },
  {
    id: 'connect_sms',
    category: 'connect',
    label: 'Connect — autorização SMS',
    description: 'Autorização via SMS para contas conectadas.',
    docUrl: 'https://developer.pagbank.com.br/reference/solicitar-autorizacao-via-sms',
    implemented: false,
  },
  {
    id: 'connect_token',
    category: 'connect',
    label: 'Connect — access token',
    description: 'Obter e renovar tokens de acesso de contas conectadas.',
    docUrl: 'https://developer.pagbank.com.br/reference/obter-access-token',
    implemented: false,
  },
  // --- Checkout PagBank ---
  {
    id: 'checkout_pagbank',
    category: 'checkout',
    label: 'Checkout PagBank',
    description: 'Redireciona cliente para página de checkout hospedada PagBank.',
    docUrl: 'https://developer.pagbank.com.br/reference/criar-checkout',
    implemented: false,
    optionFields: [
      { key: 'successUrl', label: 'URL sucesso', type: 'url' },
      { key: 'failureUrl', label: 'URL falha', type: 'url' },
    ],
  },
  // --- Recorrente ---
  {
    id: 'recurring_plans',
    category: 'recurring',
    label: 'Planos de assinatura',
    description: 'Criação e gestão de planos de cobrança recorrente.',
    docUrl: 'https://developer.pagbank.com.br/reference/criar-plano',
    implemented: false,
  },
  {
    id: 'recurring_subscriptions',
    category: 'recurring',
    label: 'Assinaturas',
    description: 'Assinantes, assinaturas, faturas e cobrança automática.',
    docUrl: 'https://developer.pagbank.com.br/reference/criar-assinatura',
    implemented: false,
  },
  // --- Transferência ---
  {
    id: 'transfer_balance',
    category: 'transfer',
    label: 'Transferência entre contas',
    description: 'Movimentação de saldo entre contas PagBank.',
    docUrl: 'https://developer.pagbank.com.br/reference/introducao',
    implemented: false,
  },
  // --- Cadastro ---
  {
    id: 'account_register',
    category: 'registration',
    label: 'API de Cadastro (contas)',
    description: 'Criar contas PagBank em nome de terceiros (parceiros).',
    docUrl: 'https://developer.pagbank.com.br/reference/criar-conta',
    implemented: false,
  },
  // --- Segurança / complementares ---
  {
    id: 'public_keys',
    category: 'security',
    label: 'Chaves públicas',
    description: 'Checkout transparente, criptografia de cartão e 3DS.',
    docUrl: 'https://developer.pagbank.com.br/reference/criar-chave-publica',
    implemented: false,
  },
  {
    id: 'mtls_certificate',
    category: 'security',
    label: 'Certificado digital (mTLS)',
    description: 'Certificado mTLS como fator adicional de segurança nas APIs.',
    docUrl: 'https://developer.pagbank.com.br/reference/criar-certificado-digital',
    implemented: false,
  },
  {
    id: 'webhooks_orders',
    category: 'security',
    label: 'Webhooks — pedidos',
    description: 'Notificações de status de pedido e pagamento.',
    docUrl: 'https://developer.pagbank.com.br/reference/confirmar-autenticidade-da-notificacao',
    implemented: false,
    optionFields: [
      { key: 'webhookUrl', label: 'URL do webhook', type: 'url' },
      { key: 'webhookSecret', label: 'Segredo (validação)', type: 'text' },
    ],
  },
  {
    id: 'webhooks_checkout',
    category: 'security',
    label: 'Webhooks — checkout',
    description: 'Notificações de status do checkout hospedado e pagamentos vinculados.',
    docUrl: 'https://developer.pagbank.com.br/reference/criar-checkout',
    implemented: false,
  },
  {
    id: 'edi_statements',
    category: 'complementary',
    label: 'EDI — extratos',
    description: 'Intercâmbio eletrônico para reconciliação de vendas.',
    docUrl: 'https://developer.pagbank.com.br/reference/introducao',
    implemented: false,
  },
];

export const PAGBANK_FLOW_CATEGORY_LABELS: Record<PagbankFlowCategory, string> = {
  orders: 'API de Pedidos (Order)',
  split: 'Divisão de pagamento',
  connect: 'Connect',
  checkout: 'Checkout PagBank',
  recurring: 'Pagamento recorrente',
  transfer: 'Transferência',
  registration: 'API de Cadastro',
  security: 'Segurança e webhooks',
  complementary: 'Complementares',
};

export type PagbankFlowConfigItem = {
  enabled: boolean;
  options?: Record<string, string | number | boolean>;
};

export type PagbankFlowsConfigMap = Record<string, PagbankFlowConfigItem>;

export function defaultPagbankFlowsConfig(): PagbankFlowsConfigMap {
  const map: PagbankFlowsConfigMap = {};
  for (const flow of PAGBANK_FLOW_CATALOG) {
    map[flow.id] = {
      enabled: false,
      options: {},
    };
  }
  return map;
}

export function mergePagbankFlowsConfig(
  stored: PagbankFlowsConfigMap | null | undefined,
): PagbankFlowsConfigMap {
  const base = defaultPagbankFlowsConfig();
  if (!stored) return base;
  for (const flow of PAGBANK_FLOW_CATALOG) {
    if (stored[flow.id]) {
      base[flow.id] = {
        enabled: stored[flow.id].enabled ?? base[flow.id].enabled,
        options: { ...base[flow.id].options, ...stored[flow.id].options },
      };
    }
  }
  return base;
}
