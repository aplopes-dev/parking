/** CPF válido (11 dígitos) único por execução — evita conflito de tax_id no sandbox PagBank. */
export function generateSandboxCustomerTaxId(seed = Date.now()): string {
  const digits: number[] = [];
  let n = Math.abs(Math.floor(seed));
  for (let i = 0; i < 9; i++) {
    digits.push(n % 10);
    n = Math.floor(n / 10);
  }
  if (digits.every((d) => d === digits[0])) {
    digits[8] = (digits[8] + 1) % 10;
  }

  const calcDigit = (base: number[], weights: number[]) => {
    const sum = base.reduce((acc, d, i) => acc + d * weights[i], 0);
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };

  const d1 = calcDigit(digits, [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = calcDigit([...digits, d1], [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);

  return [...digits, d1, d2].join('');
}

const SANDBOX_EMAIL_DOMAIN = '@aplopes.test';

/** E-mail único por execução, entre 5 e 60 caracteres (limite PagBank Orders). */
export function sandboxCustomerEmail(scenarioId: string, runId = Date.now()): string {
  const maxLen = 60 - SANDBOX_EMAIL_DOMAIN.length;
  const seed = `${scenarioId}:${runId}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (Math.imul(31, hash) + seed.charCodeAt(i)) | 0;
  }
  const local = `sb.${Math.abs(hash).toString(36)}${String(runId).slice(-6)}`;
  const trimmed = local.length <= maxLen ? local : local.slice(0, maxLen);
  const email = `${trimmed}${SANDBOX_EMAIL_DOMAIN}`;
  if (email.length < 5) {
    return `sb.${String(runId).slice(-8)}${SANDBOX_EMAIL_DOMAIN}`;
  }
  return email.length <= 60 ? email : email.slice(0, 60);
}
