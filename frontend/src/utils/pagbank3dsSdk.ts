const PAGSEGURO_SDK_URL =
  'https://assets.pagseguro.com.br/checkout-sdk-js/rc/dist/browser/pagseguro.min.js';

export type Pagbank3dsAuthResult = {
  status: string;
  id?: string;
};

type PagseguroSdk = {
  setUp: (opts: { session: string; env: string }) => void;
  authenticate3DS: (request: unknown) => Promise<Pagbank3dsAuthResult>;
};

declare global {
  interface Window {
    PagSeguro?: PagseguroSdk;
  }
}

let sdkLoadPromise: Promise<void> | null = null;

export function loadPagseguroSdk(): Promise<void> {
  if (window.PagSeguro) return Promise.resolve();
  if (sdkLoadPromise) return sdkLoadPromise;
  sdkLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${PAGSEGURO_SDK_URL}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Falha ao carregar SDK PagBank')));
      return;
    }
    const script = document.createElement('script');
    script.src = PAGSEGURO_SDK_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Falha ao carregar SDK PagBank'));
    document.head.appendChild(script);
  });
  return sdkLoadPromise;
}

function formatPagseguroSdkError(err: unknown): string {
  if (!err || typeof err !== 'object') {
    return 'Erro na autenticação 3DS PagBank';
  }
  const e = err as {
    message?: string;
    detail?: {
      message?: string;
      httpStatus?: number;
      errorMessages?: Array<{
        code?: string;
        description?: string;
        parameter_name?: string;
        parameterName?: string;
      }>;
    };
  };
  const parts: string[] = [];
  if (e.message) parts.push(e.message);
  if (e.detail?.message) parts.push(e.detail.message);
  for (const item of e.detail?.errorMessages ?? []) {
    const line = [item.code, item.description, item.parameter_name ?? item.parameterName]
      .filter((p) => p != null && String(p).trim() !== '')
      .join(' — ');
    if (line) parts.push(line);
  }
  return parts.length ? parts.join('; ') : 'Erro na autenticação 3DS PagBank';
}

export async function runPagbankAuthenticate3ds(
  session: string,
  sdkEnv: string,
  authenticate3dsRequest: unknown,
): Promise<Pagbank3dsAuthResult> {
  await loadPagseguroSdk();
  if (!window.PagSeguro) {
    throw new Error('SDK PagBank indisponível após carregar o script');
  }
  window.PagSeguro.setUp({ session, env: sdkEnv });
  let result: Pagbank3dsAuthResult;
  try {
    result = await window.PagSeguro.authenticate3DS(authenticate3dsRequest);
  } catch (err) {
    throw new Error(formatPagseguroSdkError(err));
  }
  if (result.status === 'AUTH_FLOW_COMPLETED' && result.id) {
    return result;
  }
  if (result.status === 'REQUIRE_CHALLENGE') {
    throw new Error(
      '3DS exige desafio no browser (REQUIRE_CHALLENGE). Use um cartão/valor da doc sem desafio (ex.: Visa 4000…2701, R$ 27,01).',
    );
  }
  if (result.status === 'AUTH_NOT_SUPPORTED') {
    throw new Error('Cartão não elegível a 3DS (AUTH_NOT_SUPPORTED).');
  }
  if (result.status === 'CHANGE_PAYMENT_METHOD') {
    throw new Error('PagBank solicitou outro meio de pagamento (CHANGE_PAYMENT_METHOD).');
  }
  throw new Error(`Autenticação 3DS não concluída: status=${result.status}`);
}
