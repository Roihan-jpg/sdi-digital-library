import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AppError } from '../../common/errors/app-error.js';
import { validateCover, validateMainFile } from './digital-library.service.js';

function file(name: string, mimetype: string, size = 1024): Express.Multer.File {
  return { fieldname: 'file', originalname: name, encoding: '7bit', mimetype, size, buffer: Buffer.alloc(1), stream: null!, destination: '', filename: '', path: '' };
}
describe('digital file validation', () => {
  it('accepts PDF for ebook and rejects media mismatch', () => {
    assert.doesNotThrow(() => validateMainFile(file('cerita.pdf', 'application/pdf'), 'ebook'));
    assert.throws(() => validateMainFile(file('cerita.pdf', 'application/pdf'), 'video'), (error: unknown) => error instanceof AppError && error.code === 'DIGITAL_MEDIA_MISMATCH');
  });
  it('rejects unsafe file names and oversized covers', () => {
    assert.throws(() => validateMainFile(file('../rahasia.pdf', 'application/pdf'), 'ebook'));
    assert.throws(() => validateCover(file('cover.png', 'image/png', 5 * 1024 * 1024 + 1)));
  });
});
