import { HttpErrorResponse } from '@angular/common/http';
import { parseApiError } from './api-error';

describe('parseApiError', () => {
  it('extracts the safe API error contract and request reference', () => {
    const error = new HttpErrorResponse({
      status: 409,
      error: {
        error: {
          code: 'DUPLICATE_DATA',
          message: 'Data sudah digunakan.',
          requestId: 'request-123',
        },
      },
    });

    expect(parseApiError(error, 'Permintaan belum dapat diproses.')).toEqual({
      code: 'DUPLICATE_DATA',
      message: 'Data sudah digunakan.',
      requestId: 'request-123',
      status: 409,
    });
  });

  it('uses an actionable network fallback without exposing an arbitrary error message', () => {
    const error = new HttpErrorResponse({ status: 0, error: new Error('socket details') });

    expect(parseApiError(error, 'Data belum dapat dimuat.')).toEqual({
      message: 'Server tidak dapat dihubungi. Periksa koneksi lalu coba lagi.',
      status: 0,
    });
    expect(parseApiError(new Error('private stack detail'), 'Data belum dapat dimuat.')).toEqual({
      message: 'Data belum dapat dimuat.',
      status: null,
    });
  });
});
