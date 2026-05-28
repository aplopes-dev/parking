export type SandboxBoletoHolderInput = {
  name: string;
  email: string;
  taxId: string;
};

/** Data de vencimento yyyy-MM-dd (mín. D+1 em geral). */
export function sandboxBoletoDueDate(daysAhead = 3): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

export function buildSandboxBoletoHolder(input: SandboxBoletoHolderInput): Record<string, unknown> {
  const taxId = input.taxId.replace(/\D/g, '');
  return {
    name: input.name.slice(0, 30),
    tax_id: taxId,
    email: input.email,
    address: {
      country: 'Brasil',
      region: 'São Paulo',
      region_code: 'SP',
      city: 'Sao Paulo',
      postal_code: '01452002',
      street: 'Avenida Brigadeiro Faria Lima',
      number: '1384',
      locality: 'Pinheiros',
    },
  };
}

/**
 * Objeto payment_method.boleto para POST /orders (sandbox e checkout).
 * @see https://developer.pagbank.com.br/reference/criar-e-pagar-pedido-com-boleto
 */
export function buildSandboxBoletoPaymentFields(
  holder: Record<string, unknown>,
  dueDate?: string,
): Record<string, unknown> {
  return {
    due_date: dueDate ?? sandboxBoletoDueDate(3),
    instruction_lines: {
      line_1: 'Pagamento processado para Aplopes Food',
      line_2: 'Via PagBank Sandbox',
    },
    holder,
  };
}
