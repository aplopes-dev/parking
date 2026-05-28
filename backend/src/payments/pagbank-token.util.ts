import { BadRequestException } from '@nestjs/common';

/** Remove BOM, zero-width, aspas e prefixo "Bearer " colados por engano. */
export function sanitizePagbankToken(raw: string): string {
  let t = raw.trim().replace(/^\uFEFF/, '');
  t = t.replace(/[\u200B-\u200D\u2060\u00AD]/g, '');
  t = t.replace(/\u00A0/g, ' ').trim();
  if (/^Bearer\s+/i.test(t)) {
    t = t.slice(7).trim();
  }
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    t = t.slice(1, -1).trim();
  }
  return t;
}

/** Headers HTTP exigem Latin-1; rejeita ✓, ✗, bullets, etc. */
export function assertPagbankTokenHeaderSafe(token: string): void {
  for (let i = 0; i < token.length; i++) {
    const code = token.charCodeAt(i);
    if (code > 255) {
      const ch = token[i];
      throw new BadRequestException(
        `Token inválido: caractere "${ch}" (posição ${i + 1}). Cole apenas o token UUID da PagBank, sem ícones ✓/✗, aspas ou texto extra.`,
      );
    }
  }
}

export function preparePagbankToken(raw: string): string {
  const token = sanitizePagbankToken(raw);
  if (!token) {
    throw new BadRequestException('Token PagBank vazio');
  }
  assertPagbankTokenHeaderSafe(token);
  return token;
}
