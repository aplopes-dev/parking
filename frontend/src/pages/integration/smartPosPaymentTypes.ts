/** Formas aceitas pela API mobile (`MobilePaymentDto.method`). */
export type MobilePaymentMethod = 'cash' | 'debit' | 'credit' | 'pix';

export type MobilePaymentOption = {
  method: MobilePaymentMethod;
  label: string;
  description: string;
};

export const MOBILE_PAYMENT_OPTIONS: readonly MobilePaymentOption[] = [
  { method: 'cash', label: 'Dinheiro', description: 'Pagamento em espécie' },
  { method: 'debit', label: 'Cartão débito', description: 'Débito na maquininha' },
  { method: 'credit', label: 'Cartão crédito', description: 'Crédito na maquininha' },
  { method: 'pix', label: 'PIX', description: 'Transferência instantânea' },
] as const;
