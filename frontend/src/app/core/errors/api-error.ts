import { HttpErrorResponse } from '@angular/common/http';

export interface ApiErrorDetails {
  message: string;
  status: number | null;
  code?: string;
  requestId?: string;
}

interface ApiErrorBody {
  error?: {
    code?: unknown;
    message?: unknown;
    requestId?: unknown;
  };
}

export function parseApiError(error: unknown, fallback: string): ApiErrorDetails {
  if (!(error instanceof HttpErrorResponse)) return { message: fallback, status: null };
  if (error.status === 0) {
    return {
      message: 'Server tidak dapat dihubungi. Periksa koneksi lalu coba lagi.',
      status: 0,
    };
  }

  const body = isRecord(error.error) ? (error.error as ApiErrorBody) : undefined;
  const apiError = body?.error;
  const message = stringValue(apiError?.message) ?? fallback;
  const code = stringValue(apiError?.code);
  const requestId = stringValue(apiError?.requestId);

  return {
    message,
    status: error.status,
    ...(code ? { code } : {}),
    ...(requestId ? { requestId } : {}),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}
