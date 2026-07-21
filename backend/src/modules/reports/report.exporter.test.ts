import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createExcelReport, createPdfReport } from './report.exporter.js';
import type { ReportResult, SchoolIdentity } from './report.types.js';

const school: SchoolIdentity = { schoolName: 'SD Islam Tompokersan', schoolAddress: 'Lumajang', schoolPhone: null, schoolEmail: null, schoolLogoPath: null };
const report: ReportResult = { kind: 'inventory', title: 'Stok dan Inventaris', columns: [{ key: 'title', label: 'Judul' }, { key: 'total', label: 'Total', type: 'number' }], rows: [{ title: 'Buku Uji', total: 2 }], summary: { totalCopies: 2 }, filters: { from: '2026-07-01', to: '2026-07-31', search: '', limit: 200 } };

describe('report exports', () => {
  it('creates valid PDF and Excel signatures', async () => {
    const [pdf, excel] = await Promise.all([createPdfReport(report, school), createExcelReport(report, school)]);
    assert.equal(pdf.subarray(0, 4).toString(), '%PDF');
    assert.equal(excel.subarray(0, 2).toString(), 'PK');
    assert.ok(pdf.length > 500);
    assert.ok(excel.length > 1000);
  });
});
