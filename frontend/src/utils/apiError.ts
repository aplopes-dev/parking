import { AxiosError } from 'axios';

type ApiErrorBody = {
  message?: string | string[];
};

function extractMessage(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const msg = (data as ApiErrorBody).message;
  if (typeof msg === 'string') return msg;
  if (Array.isArray(msg)) return msg.join(', ');
  return undefined;
}

export function isAxiosError(err: unknown): err is AxiosError<ApiErrorBody> {
  return (
    typeof err === 'object' &&
    err !== null &&
    'isAxiosError' in err &&
    (err as AxiosError).isAxiosError === true
  );
}

/** Mensagem amigável a partir de erros de API sem usar `any`. */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    const fromBody = extractMessage(err.response?.data);
    if (fromBody) return fromBody;
    if (err.message) return err.message;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
