import { TariffBillingType, VehicleType } from './entities/parking.enums';

export type TariffLike = {
  billingType: TariffBillingType;
  price: string | number;
  graceMinutes?: number;
  blockMinutes?: number;
  maxDailyPrice?: string | number | null;
};

export type TariffQuoteInput = {
  entryAt: Date | string;
  exitAt?: Date | string;
  vehicleType?: VehicleType | null;
};

export type TariffQuoteResult = {
  billingType: TariffBillingType;
  durationMinutes: number;
  billableMinutes: number;
  blocks: number;
  amount: number;
  breakdown: string;
};

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  return Number(value);
}

function diffMinutes(entryAt: Date, exitAt: Date): number {
  return Math.max(0, Math.floor((exitAt.getTime() - entryAt.getTime()) / 60000));
}

function calendarDaysSpanned(entryAt: Date, exitAt: Date): number {
  const start = new Date(entryAt);
  start.setHours(0, 0, 0, 0);
  const end = new Date(exitAt);
  end.setHours(0, 0, 0, 0);
  const days = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
  return Math.max(1, days);
}

export function calculateTariffAmount(
  tariff: TariffLike,
  input: TariffQuoteInput,
): TariffQuoteResult {
  const entryAt = new Date(input.entryAt);
  const exitAt = input.exitAt ? new Date(input.exitAt) : new Date();
  const durationMinutes = diffMinutes(entryAt, exitAt);
  const price = toNumber(tariff.price);

  if (tariff.billingType === TariffBillingType.MONTHLY) {
    return {
      billingType: tariff.billingType,
      durationMinutes,
      billableMinutes: 0,
      blocks: 0,
      amount: price,
      breakdown: `Mensalidade fixa R$ ${price.toFixed(2)}`,
    };
  }

  if (tariff.billingType === TariffBillingType.DAILY) {
    const days = calendarDaysSpanned(entryAt, exitAt);
    const amount = days * price;
    return {
      billingType: tariff.billingType,
      durationMinutes,
      billableMinutes: durationMinutes,
      blocks: days,
      amount,
      breakdown: `${days} diária(s) × R$ ${price.toFixed(2)}`,
    };
  }

  const grace = tariff.graceMinutes ?? 0;
  const blockMinutes = Math.max(1, tariff.blockMinutes ?? 60);
  const billableMinutes = Math.max(0, durationMinutes - grace);
  const blocks = billableMinutes === 0 ? 0 : Math.ceil(billableMinutes / blockMinutes);
  let amount = blocks * price;
  const maxDaily = toNumber(tariff.maxDailyPrice);
  if (maxDaily > 0 && amount > maxDaily) {
    amount = maxDaily;
  }

  return {
    billingType: tariff.billingType,
    durationMinutes,
    billableMinutes,
    blocks,
    amount,
    breakdown:
      billableMinutes === 0
        ? `Tolerância de ${grace} min — sem cobrança`
        : `${blocks} bloco(s) de ${blockMinutes} min × R$ ${price.toFixed(2)}` +
          (maxDaily > 0 ? ` (teto diário R$ ${maxDaily.toFixed(2)})` : ''),
  };
}

export function vehicleTypeMatches(
  tariffVehicle: VehicleType | null | undefined,
  sessionVehicle: VehicleType | null | undefined,
): boolean {
  if (!tariffVehicle) return true;
  return tariffVehicle === sessionVehicle;
}
