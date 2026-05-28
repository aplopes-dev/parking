import { OrdersTestScenario } from './pagbank-orders-test.catalog';
import { RecurringCardPlain } from './pagbank-card-encrypt.util';

export type CardScenarioFields = {
  cardNumber: string;
  expMonth: string;
  expYear: string;
  securityCode: string;
};

export function maskCardPan(pan: string): string {
  const digits = pan.replace(/\D/g, '');
  if (digits.length < 8) return '****';
  return `${digits.slice(0, 4)}****${digits.slice(-4)}`;
}

export function cardScenarioToPlainCard(
  scenario: CardScenarioFields,
  holderName: string,
): RecurringCardPlain {
  const expYear =
    scenario.expYear.length === 2 ? `20${scenario.expYear}` : scenario.expYear;
  return {
    holder: holderName,
    number: scenario.cardNumber,
    expMonth: scenario.expMonth,
    expYear,
    securityCode: scenario.securityCode,
  };
}

export function ordersScenarioToPlainCard(
  scenario: OrdersTestScenario,
  holderName: string,
): RecurringCardPlain {
  return cardScenarioToPlainCard(scenario, holderName);
}
