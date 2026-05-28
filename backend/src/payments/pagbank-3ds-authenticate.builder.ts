import { Orders3dsDebitScenario } from './pagbank-orders-3ds-test.catalog';

/** Endereço no formato do SDK authenticate3DS (sem `locality`). */
export type Pagbank3dsSdkAddress = {
  street: string;
  number: string;
  complement?: string;
  city: string;
  regionCode: string;
  country: string;
  postalCode: string;
};

/**
 * Monta o objeto `request` para PagSeguro.authenticate3DS conforme doc PagBank.
 * @see https://developer.pagbank.com.br/reference/criar-pagar-pedido-com-3ds-validacao-pagbank#autentique
 */
export function buildPagbank3dsAuthenticateRequest(
  scenario: Orders3dsDebitScenario,
  customer: { name: string; email: string },
): { data: Record<string, unknown> } {
  const expMonth = scenario.expMonth.padStart(2, '0');
  const expYear =
    scenario.expYear.length === 2 ? `20${scenario.expYear}` : scenario.expYear;

  const billingAddress: Pagbank3dsSdkAddress = {
    street: 'Av. Paulista',
    number: '2073',
    complement: 'Apto 100',
    city: 'São Paulo',
    regionCode: 'SP',
    country: 'BRA',
    postalCode: '01311300',
  };

  return {
    data: {
      customer: {
        name: customer.name,
        email: customer.email,
        phones: [
          { country: '55', area: '11', number: '999999999', type: 'MOBILE' },
          { country: '55', area: '11', number: '999999998', type: 'HOME' },
        ],
      },
      paymentMethod: {
        type: 'DEBIT_CARD',
        installments: 1,
        card: {
          number: scenario.cardNumber.replace(/\D/g, ''),
          expMonth,
          expYear,
          holder: { name: customer.name },
        },
      },
      amount: {
        value: scenario.amountCents,
        currency: 'BRL',
      },
      billingAddress,
      shippingAddress: { ...billingAddress },
      dataOnly: false,
    },
  };
}

/** Nome válido para 3DS: dois tokens, sem dígitos (validação do SDK). */
export function sandbox3dsCustomerName(): string {
  return 'Jose da Silva';
}
