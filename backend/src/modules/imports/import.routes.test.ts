import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AppError } from '../../common/errors/app-error.js';
import { validateImportUpload } from './import.routes.js';

function upload(name: string, mimetype: string, buffer: Buffer): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: name,
    encoding: '7bit',
    mimetype,
    size: buffer.length,
    buffer,
    stream: null!,
    destination: '',
    filename: '',
    path: '',
  };
}

describe('import upload validation', () => {
  it('accepts an XLSX ZIP signature and UTF-8 CSV', () => {
    assert.doesNotThrow(() =>
      validateImportUpload(
        upload(
          'members.xlsx',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          Buffer.from([0x50, 0x4b, 0x03, 0x04]),
        ),
      ),
    );
    assert.doesNotThrow(() =>
      validateImportUpload(upload('members.csv', 'text/csv', Buffer.from('nis,full_name\n1,Demo'))),
    );
  });

  it('rejects an executable renamed as XLSX and binary CSV content', () => {
    assert.throws(
      () => validateImportUpload(upload('members.xlsx', 'application/octet-stream', Buffer.from('MZ'))),
      (error: unknown) => error instanceof AppError && error.code === 'IMPORT_FILE_INVALID',
    );
    assert.throws(
      () => validateImportUpload(upload('members.csv', 'text/csv', Buffer.from([0x00, 0x01]))),
      (error: unknown) => error instanceof AppError && error.code === 'IMPORT_FILE_INVALID',
    );
  });
});
