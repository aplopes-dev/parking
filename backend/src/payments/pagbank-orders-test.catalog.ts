/**
 * Cartões de teste — API Pedidos (POST /orders), sandbox.
 * @see https://developer.pagbank.com.br/docs/cartoes-de-teste
 */
export type OrdersTestBrand = 'VISA' | 'MASTERCARD' | 'AMEX' | 'ELO' | 'HIPER';

export type OrdersTestScenarioGroup = 'success' | 'denied';

export type OrdersTestScenario = {
  id: string;
  label: string;
  group: OrdersTestScenarioGroup;
  brand: OrdersTestBrand;
  behavior: string;
  cardNumber: string;
  securityCode: string;
  expMonth: string;
  expYear: string;
};

const EXP = { month: '12', year: '2030' };
const CVV = '123';

export const ORDERS_TEST_GROUP_LABELS: Record<OrdersTestScenarioGroup, string> = {
  success: 'Autorizados (sandbox)',
  denied: 'Não autorizados — negados (sandbox)',
};

export const ORDERS_TEST_SCENARIOS: OrdersTestScenario[] = [
  {
    id: 'orders_visa_success',
    label: 'Visa — aprovado',
    group: 'success',
    brand: 'VISA',
    behavior: 'Autorização bem-sucedida (PAID ou AUTHORIZED).',
    cardNumber: '4539620659922097',
    securityCode: CVV,
    expMonth: EXP.month,
    expYear: EXP.year,
  },
  {
    id: 'orders_mastercard_success',
    label: 'Mastercard — aprovado',
    group: 'success',
    brand: 'MASTERCARD',
    behavior: 'Autorização bem-sucedida (PAID ou AUTHORIZED).',
    cardNumber: '5240082975622454',
    securityCode: CVV,
    expMonth: EXP.month,
    expYear: EXP.year,
  },
  {
    id: 'orders_amex_success',
    label: 'American Express — aprovado',
    group: 'success',
    brand: 'AMEX',
    behavior: 'Autorização bem-sucedida (PAID ou AUTHORIZED).',
    cardNumber: '345817690311361',
    securityCode: CVV,
    expMonth: EXP.month,
    expYear: EXP.year,
  },
  {
    id: 'orders_elo_success',
    label: 'Elo — aprovado',
    group: 'success',
    brand: 'ELO',
    behavior: 'Autorização bem-sucedida (PAID ou AUTHORIZED).',
    cardNumber: '4514161122113757',
    securityCode: CVV,
    expMonth: EXP.month,
    expYear: EXP.year,
  },
  {
    id: 'orders_hiper_success',
    label: 'Hiper — aprovado',
    group: 'success',
    brand: 'HIPER',
    behavior: 'Autorização bem-sucedida (PAID ou AUTHORIZED).',
    cardNumber: '6062828598919021',
    securityCode: CVV,
    expMonth: EXP.month,
    expYear: EXP.year,
  },
  {
    id: 'orders_visa_denied',
    label: 'Visa — negado',
    group: 'denied',
    brand: 'VISA',
    behavior: 'Pagamento negado (DECLINED).',
    cardNumber: '4929291898380766',
    securityCode: CVV,
    expMonth: EXP.month,
    expYear: EXP.year,
  },
  {
    id: 'orders_mastercard_denied',
    label: 'Mastercard — negado',
    group: 'denied',
    brand: 'MASTERCARD',
    behavior: 'Pagamento negado (DECLINED).',
    cardNumber: '5530062640663264',
    securityCode: CVV,
    expMonth: EXP.month,
    expYear: EXP.year,
  },
  {
    id: 'orders_amex_denied',
    label: 'American Express — negado',
    group: 'denied',
    brand: 'AMEX',
    behavior: 'Pagamento negado (DECLINED).',
    cardNumber: '372938001199778',
    securityCode: CVV,
    expMonth: EXP.month,
    expYear: EXP.year,
  },
  {
    id: 'orders_elo_denied',
    label: 'Elo — negado',
    group: 'denied',
    brand: 'ELO',
    behavior: 'Pagamento negado (DECLINED).',
    cardNumber: '4389350446134811',
    securityCode: CVV,
    expMonth: EXP.month,
    expYear: EXP.year,
  },
  {
    id: 'orders_hiper_denied',
    label: 'Hiper — negado',
    group: 'denied',
    brand: 'HIPER',
    behavior: 'Pagamento negado (DECLINED).',
    cardNumber: '6062822916014409',
    securityCode: CVV,
    expMonth: EXP.month,
    expYear: EXP.year,
  },
];

export function getOrdersTestScenario(id: string): OrdersTestScenario | undefined {
  return ORDERS_TEST_SCENARIOS.find((s) => s.id === id);
}
