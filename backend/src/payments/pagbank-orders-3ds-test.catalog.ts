/**
 * Cartões e valores para testes 3DS (débito) — sandbox PagBank.
 * @see https://developer.pagbank.com.br/reference/criar-pagar-pedido-com-3ds-validacao-pagbank#casos-de-teste
 */
export type Orders3dsDebitScenarioGroup = 'auth_success' | 'auth_declined';

export type Orders3dsDebitScenario = {
  id: string;
  label: string;
  group: Orders3dsDebitScenarioGroup;
  brand: 'VISA' | 'MASTERCARD' | 'ELO';
  behavior: string;
  cardNumber: string;
  securityCode: string;
  expMonth: string;
  expYear: string;
  /** Valor em centavos — deve corresponder ao cartão (doc PagBank 3DS). */
  amountCents: number;
};

export const ORDERS_3DS_DEBIT_GROUP_LABELS: Record<Orders3dsDebitScenarioGroup, string> = {
  auth_success: '3DS autenticado — espera PAID',
  auth_declined: '3DS autenticado — espera DECLINED no pagamento',
};

export const ORDERS_3DS_DEBIT_SCENARIOS: Orders3dsDebitScenario[] = [
  {
    id: '3ds_visa_debit_auth',
    label: 'Visa — 3DS sem desafio',
    group: 'auth_success',
    brand: 'VISA',
    behavior: 'authenticate3DS → AUTH_FLOW_COMPLETED; POST /orders com amount 2701 → PAID.',
    cardNumber: '4000000000002701',
    securityCode: '123',
    expMonth: '12',
    expYear: '2026',
    amountCents: 2701,
  },
  {
    id: '3ds_mastercard_debit_auth',
    label: 'Mastercard — 3DS sem desafio',
    group: 'auth_success',
    brand: 'MASTERCARD',
    behavior: 'authenticate3DS → AUTH_FLOW_COMPLETED; amount 1005 → PAID.',
    cardNumber: '5200000000001005',
    securityCode: '123',
    expMonth: '12',
    expYear: '2026',
    amountCents: 1005,
  },
  {
    id: '3ds_elo_debit_auth',
    label: 'Elo — 3DS sem desafio',
    group: 'auth_success',
    brand: 'ELO',
    behavior: 'authenticate3DS → AUTH_FLOW_COMPLETED; amount 1000 → PAID.',
    cardNumber: '6505050000001000',
    securityCode: '123',
    expMonth: '12',
    expYear: '2026',
    amountCents: 1000,
  },
  {
    id: '3ds_visa_debit_auth_declined',
    label: 'Visa — 3DS OK, pagamento negado',
    group: 'auth_declined',
    brand: 'VISA',
    behavior: '3DS autenticado; amount 4001 com mesmo PAN → charge DECLINED.',
    cardNumber: '4000000000002701',
    securityCode: '123',
    expMonth: '12',
    expYear: '2026',
    amountCents: 4001,
  },
];

export function getOrders3dsDebitScenario(id: string): Orders3dsDebitScenario | undefined {
  return ORDERS_3DS_DEBIT_SCENARIOS.find((s) => s.id === id);
}
