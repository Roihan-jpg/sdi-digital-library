import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import type { ReportResult, SchoolIdentity } from './report.types.js';

export async function createExcelReport(report: ReportResult, school: SchoolIdentity) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = school.schoolName;
  workbook.created = new Date();
  const sheet = workbook.addWorksheet('Laporan', { views: [{ state: 'frozen', ySplit: 8 }] });
  sheet.mergeCells(1, 1, 1, Math.max(report.columns.length, 1));
  sheet.getCell('A1').value = school.schoolName;
  sheet.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FF17452F' } };
  sheet.mergeCells(2, 1, 2, Math.max(report.columns.length, 1));
  sheet.getCell('A2').value = school.schoolAddress ?? '';
  sheet.mergeCells(4, 1, 4, Math.max(report.columns.length, 1));
  sheet.getCell('A4').value = report.title;
  sheet.getCell('A4').font = { bold: true, size: 14 };
  sheet.getCell('A5').value = `Periode: ${report.filters.from} s.d. ${report.filters.to}`;
  sheet.getCell('A6').value = `Dicetak: ${formatDateTime(new Date())}`;
  sheet.getCell('A7').value = filterText(report);
  const header = sheet.addRow(report.columns.map((column) => column.label));
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF176B43' } };
  for (const row of report.rows) {
    sheet.addRow(report.columns.map((column) => excelValue(row[column.key], column.type)));
  }
  sheet.addRow([]);
  sheet.addRow(['Ringkasan']);
  for (const [key, value] of Object.entries(report.summary)) sheet.addRow([summaryLabel(key), value]);
  sheet.columns.forEach((column, index) => {
    const label = report.columns[index]?.label ?? '';
    column.width = Math.min(36, Math.max(14, label.length + 3));
  });
  sheet.autoFilter = { from: { row: 8, column: 1 }, to: { row: 8, column: report.columns.length } };
  sheet.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
  sheet.headerFooter.oddFooter = `&L${school.schoolName}&C${report.title}&RHalaman &P dari &N`;
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export async function createPdfReport(report: ReportResult, school: SchoolIdentity) {
  const document = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 36, bufferPages: true });
  const chunks: Buffer[] = [];
  document.on('data', (chunk: Buffer) => chunks.push(chunk));
  const completed = new Promise<Buffer>((resolve, reject) => {
    document.on('end', () => resolve(Buffer.concat(chunks)));
    document.on('error', reject);
  });
  const columns = report.columns.slice(0, 8);
  const pageWidth = document.page.width - 72;
  const columnWidth = pageWidth / Math.max(columns.length, 1);
  const drawHeading = () => {
    document.fillColor('#17452f').fontSize(16).font('Helvetica-Bold').text(school.schoolName);
    document.fillColor('#333333').fontSize(8).font('Helvetica').text(school.schoolAddress ?? '');
    document.moveDown(0.7).fontSize(13).font('Helvetica-Bold').text(report.title);
    document.fontSize(8).font('Helvetica').text(`Periode ${report.filters.from} s.d. ${report.filters.to} | Dicetak ${formatDateTime(new Date())}`);
    document.text(filterText(report));
    document.moveDown(0.5);
  };
  const drawHeader = () => {
    const y = document.y;
    columns.forEach((column, index) => {
      document.rect(36 + index * columnWidth, y, columnWidth, 22).fillAndStroke('#176b43', '#ffffff');
      document.fillColor('#ffffff').font('Helvetica-Bold').fontSize(7).text(column.label, 40 + index * columnWidth, y + 6, { width: columnWidth - 8 });
    });
    document.y = y + 22;
  };
  drawHeading();
  drawHeader();
  for (const row of report.rows) {
    if (document.y > document.page.height - 70) {
      document.addPage();
      drawHeading();
      drawHeader();
    }
    const y = document.y;
    columns.forEach((column, index) => {
      document.rect(36 + index * columnWidth, y, columnWidth, 22).stroke('#c9d5ce');
      document.fillColor('#222222').font('Helvetica').fontSize(7).text(displayValue(row[column.key], column.type), 40 + index * columnWidth, y + 5, { width: columnWidth - 8, height: 13, ellipsis: true });
    });
    document.y = y + 22;
  }
  document.moveDown().font('Helvetica-Bold').fontSize(9).fillColor('#17452f').text('Ringkasan');
  document.font('Helvetica').fillColor('#222222');
  for (const [key, value] of Object.entries(report.summary)) document.text(`${summaryLabel(key)}: ${value}`);
  const pages = document.bufferedPageRange();
  for (let index = pages.start; index < pages.start + pages.count; index += 1) {
    document.switchToPage(index);
    document.fontSize(7).fillColor('#555555').text(`Halaman ${index + 1} dari ${pages.count}`, 36, document.page.height - 28, { width: document.page.width - 72, align: 'right' });
  }
  document.end();
  return completed;
}

function excelValue(value: unknown, type?: string) {
  if (type === 'number' || type === 'currency') return Number(value ?? 0);
  return displayValue(value, type);
}
function displayValue(value: unknown, type?: string) {
  if (value === null || value === undefined || value === '') return '—';
  if (type === 'currency') return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value));
  if (type === 'date') return new Date(String(value)).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
  return String(value);
}
function filterText(report: ReportResult) {
  const parts = Object.entries(report.filters).filter(([key, value]) => !['from', 'to', 'limit'].includes(key) && value);
  return parts.length ? `Filter: ${parts.map(([key, value]) => `${summaryLabel(key)}=${value}`).join(', ')}` : 'Filter: Semua data dalam periode';
}
function summaryLabel(value: string) { return value.replace(/([A-Z])/g, ' $1').replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase()); }
function formatDateTime(value: Date) { return value.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }); }
