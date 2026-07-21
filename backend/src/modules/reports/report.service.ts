import type { SupabaseClient } from '@supabase/supabase-js';
import { AppError } from '../../common/errors/app-error.js';
import type { AppConfig } from '../../config/env.js';
import { createAdminSupabaseClient } from '../../infrastructure/supabase/supabase-admin.client.js';
import { createUserSupabaseClient } from '../../infrastructure/supabase/supabase-user.client.js';
import type { AuthContext } from '../auth/auth.types.js';
import { createExcelReport, createPdfReport } from './report.exporter.js';
import type { ReportFilters, ReportKind, SchoolIdentityInput } from './report.schema.js';
import type { ReportColumn, ReportResult, SchoolIdentity } from './report.types.js';

export class ReportService {
  private readonly admin: SupabaseClient;
  constructor(private readonly config: AppConfig) { this.admin = createAdminSupabaseClient(config); }

  async dashboard(from: string, to: string) {
    const [kpis, loans, visits] = await Promise.all([
      this.admin.from('v_dashboard_kpis').select('*').single(),
      this.admin.from('v_daily_loans').select('activity_date,loan_transactions,items_borrowed').gte('activity_date', from).lte('activity_date', to).order('activity_date'),
      this.admin.from('v_daily_visits').select('visit_date,individual_visits,group_visits,group_participants').gte('visit_date', from).lte('visit_date', to).order('visit_date'),
    ]);
    if (kpis.error || loans.error || visits.error) throw unavailable('Dashboard belum dapat dimuat.');
    return { kpis: kpis.data, charts: { loans: loans.data ?? [], visits: visits.data ?? [] }, period: { from, to } };
  }

  async report(kind: ReportKind, filters: ReportFilters): Promise<ReportResult> {
    switch (kind) {
      case 'popular-books': return this.popularBooks(filters);
      case 'active-students': return this.activeStudents(filters);
      case 'overdue': return this.overdue(filters);
      case 'fines': return this.fines(filters);
      case 'damaged-lost': return this.damagedLost(filters);
      case 'inventory': return this.inventory(filters);
      case 'visits': return this.visits(filters);
      case 'digital-activity': return this.digitalActivity(filters);
      case 'accreditation': return this.accreditation(filters);
    }
  }

  async export(kind: ReportKind, filters: ReportFilters, format: 'pdf' | 'xlsx') {
    const [report, school] = await Promise.all([this.report(kind, filters), this.schoolIdentity()]);
    const buffer = format === 'pdf' ? await createPdfReport(report, school) : await createExcelReport(report, school);
    const safeDate = `${filters.from}-${filters.to}`;
    return { buffer, fileName: `${kind}-${safeDate}.${format}`, mimeType: format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
  }

  async schoolIdentity(): Promise<SchoolIdentity> {
    const { data, error } = await this.admin.from('library_settings').select('school_name,school_address,school_phone,school_email,school_logo_path').eq('id', 1).single();
    if (error || !data) throw unavailable('Identitas sekolah belum dapat dimuat.');
    return { schoolName: String(data.school_name), schoolAddress: nullable(data.school_address), schoolPhone: nullable(data.school_phone), schoolEmail: nullable(data.school_email), schoolLogoPath: nullable(data.school_logo_path) };
  }

  async updateSchoolIdentity(context: AuthContext, input: SchoolIdentityInput) {
    const { data, error } = await createUserSupabaseClient(this.config, context.accessToken).from('library_settings').update({ school_name: input.schoolName, school_address: input.schoolAddress, school_phone: input.schoolPhone, school_email: input.schoolEmail, school_logo_path: input.schoolLogoPath, updated_by: context.user.id }).eq('id', 1).select('school_name,school_address,school_phone,school_email,school_logo_path').single();
    if (error || !data) throw new AppError(422, 'SCHOOL_IDENTITY_UPDATE_FAILED', 'Identitas sekolah belum dapat diperbarui.');
    return this.schoolIdentity();
  }

  private async popularBooks(filters: ReportFilters): Promise<ReportResult> {
    const { data, error } = await this.admin.from('loan_items').select('id,loans!inner(member_id,borrowed_at),book_copies!inner(book_titles!inner(id,title,category_id,categories(name)))').gte('loans.borrowed_at', start(filters.from)).lte('loans.borrowed_at', end(filters.to)).limit(10_000);
    if (error) throw unavailable('Laporan buku populer belum dapat dimuat.');
    const grouped = new Map<string, { title: string; category: string; total: number; members: Set<string> }>();
    for (const raw of data ?? []) {
      const row = record(raw); const loan = relation(row['loans']); const copy = relation(row['book_copies']); const book = relation(copy['book_titles']);
      if (filters.categoryId && book['category_id'] !== filters.categoryId) continue;
      const id = String(book['id']); const item = grouped.get(id) ?? { title: String(book['title'] ?? ''), category: relation(book['categories'])['name'] ? String(relation(book['categories'])['name']) : 'Tanpa kategori', total: 0, members: new Set<string>() };
      item.total += 1; item.members.add(String(loan['member_id'])); grouped.set(id, item);
    }
    const rows = [...grouped.values()].map((item) => ({ title: item.title, category: item.category, totalBorrowed: item.total, uniqueBorrowers: item.members.size })).sort((a, b) => b.totalBorrowed - a.totalBorrowed);
    return result('popular-books', 'Buku Paling Sering Dipinjam', [{ key: 'title', label: 'Judul' }, { key: 'category', label: 'Kategori' }, { key: 'totalBorrowed', label: 'Total Dipinjam', type: 'number' }, { key: 'uniqueBorrowers', label: 'Peminjam Unik', type: 'number' }], filterRows(rows, filters), filters, { totalTitles: rows.length, totalLoans: sum(rows, 'totalBorrowed') });
  }

  private async activeStudents(filters: ReportFilters): Promise<ReportResult> {
    const { data, error } = await this.admin.from('loan_items').select('id,loans!inner(borrowed_at,members!inner(id,member_code,nis,full_name,is_student,class_id,study_group_id,classes(name),study_groups(name)))').gte('loans.borrowed_at', start(filters.from)).lte('loans.borrowed_at', end(filters.to)).limit(10_000);
    if (error) throw unavailable('Laporan siswa aktif belum dapat dimuat.');
    const grouped = new Map<string, Record<string, unknown>>();
    for (const raw of data ?? []) { const member = relation(relation(record(raw)['loans'])['members']); if (!member['is_student']) continue; if (filters.classId && member['class_id'] !== filters.classId) continue; if (filters.studyGroupId && member['study_group_id'] !== filters.studyGroupId) continue; const id = String(member['id']); const current = grouped.get(id) ?? { memberCode: member['member_code'], nis: member['nis'], fullName: member['full_name'], className: relation(member['classes'])['name'] ?? '—', studyGroup: relation(member['study_groups'])['name'] ?? '—', totalBorrowed: 0 }; current['totalBorrowed'] = Number(current['totalBorrowed']) + 1; grouped.set(id, current); }
    const rows = [...grouped.values()].sort((a, b) => Number(b['totalBorrowed']) - Number(a['totalBorrowed']));
    return result('active-students', 'Siswa Paling Aktif', [{ key: 'memberCode', label: 'Kode Member' }, { key: 'nis', label: 'NIS' }, { key: 'fullName', label: 'Nama' }, { key: 'className', label: 'Kelas' }, { key: 'studyGroup', label: 'Rombel' }, { key: 'totalBorrowed', label: 'Total Pinjam', type: 'number' }], filterRows(rows, filters), filters, { totalStudents: rows.length, totalItems: sum(rows, 'totalBorrowed') });
  }

  private async overdue(filters: ReportFilters): Promise<ReportResult> {
    let query = this.admin.from('v_overdue_loans').select('*').gte('due_at', start(filters.from)).lte('due_at', end(filters.to)).order('due_at').limit(filters.limit);
    if (filters.search) query = query.or(`member_name.ilike.%${safe(filters.search)}%,title.ilike.%${safe(filters.search)}%,inventory_code.ilike.%${safe(filters.search)}%`);
    const { data, error } = await query; if (error) throw unavailable('Laporan keterlambatan belum dapat dimuat.'); const rows = (data ?? []).map((row) => ({ loanNumber: row.loan_number, memberName: row.member_name, title: row.title, inventoryCode: row.inventory_code, dueAt: row.due_at, daysLate: row.days_late, estimatedFine: row.estimated_fine }));
    return result('overdue', 'Keterlambatan', [{ key: 'loanNumber', label: 'Nomor Loan' }, { key: 'memberName', label: 'Member' }, { key: 'title', label: 'Judul' }, { key: 'inventoryCode', label: 'Inventaris' }, { key: 'dueAt', label: 'Jatuh Tempo', type: 'date' }, { key: 'daysLate', label: 'Hari', type: 'number' }, { key: 'estimatedFine', label: 'Estimasi Denda', type: 'currency' }], rows, filters, { overdueItems: rows.length, estimatedFine: sum(rows, 'estimatedFine') });
  }

  private async fines(filters: ReportFilters): Promise<ReportResult> {
    let query = this.admin.from('fines').select('id,fine_type,days_late,amount,paid_amount,status,assessed_at,description,members!inner(full_name,member_code,class_id,study_group_id,classes(name),study_groups(name)),fine_payments(amount,paid_at,method)').gte('assessed_at', start(filters.from)).lte('assessed_at', end(filters.to)).order('assessed_at', { ascending: false }).limit(filters.limit);
    if (filters.status) query = query.eq('status', filters.status); if (filters.classId) query = query.eq('members.class_id', filters.classId); if (filters.studyGroupId) query = query.eq('members.study_group_id', filters.studyGroupId);
    const { data, error } = await query; if (error) throw unavailable('Laporan denda belum dapat dimuat.');
    const rows = (data ?? []).map((raw) => { const row = record(raw); const member = relation(row['members']); const payments = relations(row['fine_payments']); return { memberCode: member['member_code'], memberName: member['full_name'], className: relation(member['classes'])['name'] ?? '—', type: row['fine_type'], amount: row['amount'], paid: row['paid_amount'], balance: Number(row['amount']) - Number(row['paid_amount']), status: row['status'], paymentCount: payments.length, assessedAt: row['assessed_at'] }; });
    return result('fines', 'Denda dan Pembayaran', [{ key: 'memberCode', label: 'Kode Member' }, { key: 'memberName', label: 'Nama' }, { key: 'className', label: 'Kelas' }, { key: 'type', label: 'Jenis' }, { key: 'amount', label: 'Denda', type: 'currency' }, { key: 'paid', label: 'Dibayar', type: 'currency' }, { key: 'balance', label: 'Sisa', type: 'currency' }, { key: 'status', label: 'Status' }], filterRows(rows, filters), filters, { totalFines: rows.length, billed: sum(rows, 'amount'), paid: sum(rows, 'paid'), outstanding: sum(rows, 'balance') });
  }

  private async damagedLost(filters: ReportFilters): Promise<ReportResult> {
    let query = this.admin.from('book_copies').select('inventory_code,status,condition,notes,updated_at,book_titles!inner(title,category_id,categories(name)),shelves(code,name)').in('status', filters.status ? [filters.status] : ['damaged', 'lost']).order('updated_at', { ascending: false }).limit(filters.limit); if (filters.categoryId) query = query.eq('book_titles.category_id', filters.categoryId);
    const { data, error } = await query; if (error) throw unavailable('Laporan buku rusak dan hilang belum dapat dimuat.'); const rows = (data ?? []).map((raw) => { const row = record(raw); const book = relation(row['book_titles']); return { inventoryCode: row['inventory_code'], title: book['title'], category: relation(book['categories'])['name'] ?? '—', status: row['status'], condition: row['condition'], shelf: relation(row['shelves'])['code'] ?? '—', notes: row['notes'], updatedAt: row['updated_at'] }; });
    return result('damaged-lost', 'Buku Rusak dan Hilang', [{ key: 'inventoryCode', label: 'Inventaris' }, { key: 'title', label: 'Judul' }, { key: 'category', label: 'Kategori' }, { key: 'status', label: 'Status' }, { key: 'condition', label: 'Kondisi' }, { key: 'shelf', label: 'Rak' }, { key: 'notes', label: 'Catatan' }], filterRows(rows, filters), filters, { total: rows.length, damaged: rows.filter((row) => row.status === 'damaged').length, lost: rows.filter((row) => row.status === 'lost').length });
  }

  private async inventory(filters: ReportFilters): Promise<ReportResult> {
    let query = this.admin.from('v_inventory_summary').select('*').order('title').limit(filters.limit); if (filters.categoryId) query = query.eq('category_id', filters.categoryId); if (filters.search) query = query.ilike('title', `%${safe(filters.search)}%`);
    const { data, error } = await query; if (error) throw unavailable('Laporan inventaris belum dapat dimuat.'); const rows = (data ?? []).map((row) => ({ catalogCode: row.catalog_code, title: row.title, category: row.category_name, total: row.total_copies, available: row.available, loaned: row.loaned, reserved: row.reserved, damaged: row.damaged, lost: row.lost, maintenance: row.maintenance }));
    return result('inventory', 'Stok dan Inventaris', [{ key: 'catalogCode', label: 'Kode Katalog' }, { key: 'title', label: 'Judul' }, { key: 'category', label: 'Kategori' }, { key: 'total', label: 'Total', type: 'number' }, { key: 'available', label: 'Tersedia', type: 'number' }, { key: 'loaned', label: 'Dipinjam', type: 'number' }, { key: 'damaged', label: 'Rusak', type: 'number' }, { key: 'lost', label: 'Hilang', type: 'number' }], dataRows(rows, filters), filters, { totalTitles: rows.length, totalCopies: sum(rows, 'total'), available: sum(rows, 'available') });
  }

  private async visits(filters: ReportFilters): Promise<ReportResult> {
    const [individual, groups] = await Promise.all([
      this.admin.from('visits').select('entered_at,method,guest_name,members(full_name,member_code,class_id,study_group_id,classes(name),study_groups(name))').gte('entered_at', start(filters.from)).lte('entered_at', end(filters.to)).order('entered_at', { ascending: false }).limit(filters.limit),
      this.admin.from('group_visits').select('visited_at,teacher_name,participant_count,class_id,study_group_id,classes(name),study_groups(name)').gte('visited_at', start(filters.from)).lte('visited_at', end(filters.to)).order('visited_at', { ascending: false }).limit(filters.limit),
    ]); if (individual.error || groups.error) throw unavailable('Laporan kunjungan belum dapat dimuat.');
    const rows: Record<string, unknown>[] = [];
    for (const raw of individual.data ?? []) { const row = record(raw); const member = relation(row['members']); if (filters.classId && member['class_id'] !== filters.classId) continue; if (filters.studyGroupId && member['study_group_id'] !== filters.studyGroupId) continue; rows.push({ date: row['entered_at'], type: 'Individu', visitor: member['full_name'] ?? row['guest_name'], className: relation(member['classes'])['name'] ?? '—', studyGroup: relation(member['study_groups'])['name'] ?? '—', teacher: '—', participants: 1 }); }
    for (const raw of groups.data ?? []) { const row = record(raw); if (filters.classId && row['class_id'] !== filters.classId) continue; if (filters.studyGroupId && row['study_group_id'] !== filters.studyGroupId) continue; rows.push({ date: row['visited_at'], type: 'Rombongan', visitor: '—', className: relation(row['classes'])['name'] ?? '—', studyGroup: relation(row['study_groups'])['name'] ?? '—', teacher: row['teacher_name'], participants: row['participant_count'] }); }
    rows.sort((a, b) => String(b['date']).localeCompare(String(a['date'])));
    return result('visits', 'Kunjungan Individu dan Rombongan', [{ key: 'date', label: 'Waktu', type: 'date' }, { key: 'type', label: 'Jenis' }, { key: 'visitor', label: 'Pengunjung' }, { key: 'className', label: 'Kelas' }, { key: 'studyGroup', label: 'Rombel' }, { key: 'teacher', label: 'Pendamping' }, { key: 'participants', label: 'Jumlah', type: 'number' }], filterRows(rows, filters), filters, { records: rows.length, totalParticipants: sum(rows, 'participants'), groupVisits: rows.filter((row) => row['type'] === 'Rombongan').length });
  }

  private async digitalActivity(filters: ReportFilters): Promise<ReportResult> {
    let query = this.admin.from('v_digital_activity_daily').select('*').gte('activity_date', filters.from).lte('activity_date', filters.to).order('activity_date', { ascending: false }).limit(filters.limit); if (filters.categoryId) query = query.eq('category_id', filters.categoryId); if (filters.status) query = query.eq('action', filters.status); if (filters.search) query = query.ilike('title', `%${safe(filters.search)}%`);
    const { data, error } = await query; if (error) throw unavailable('Laporan aktivitas digital belum dapat dimuat.'); const rows = (data ?? []).map((row) => ({ date: row.activity_date, title: row.title, category: row.category_name, mediaType: row.media_type, action: row.action, totalActions: row.total_actions, uniqueUsers: row.unique_users }));
    return result('digital-activity', 'Aktivitas Koleksi Digital', [{ key: 'date', label: 'Tanggal' }, { key: 'title', label: 'Koleksi' }, { key: 'category', label: 'Kategori' }, { key: 'mediaType', label: 'Media' }, { key: 'action', label: 'Aktivitas' }, { key: 'totalActions', label: 'Total', type: 'number' }, { key: 'uniqueUsers', label: 'Pengguna Unik', type: 'number' }], rows, filters, { totalActions: sum(rows, 'totalActions'), uniqueRows: rows.length });
  }

  private async accreditation(filters: ReportFilters): Promise<ReportResult> {
    const [dashboard, members, digital, payments, visits] = await Promise.all([
      this.dashboard(filters.from, filters.to),
      this.admin.from('members').select('id', { count: 'exact', head: true }).eq('is_active', true),
      this.admin.from('digital_collections').select('id', { count: 'exact', head: true }).eq('is_published', true),
      this.admin.from('fine_payments').select('amount').gte('paid_at', start(filters.from)).lte('paid_at', end(filters.to)),
      this.admin.from('v_daily_visits').select('individual_visits,group_visits,group_participants').gte('visit_date', filters.from).lte('visit_date', filters.to),
    ]); if (members.error || digital.error || payments.error || visits.error) throw unavailable('Ringkasan akreditasi belum dapat dimuat.'); const kpi = record(dashboard.kpis);
    const rows = [
      { indicator: 'Judul buku aktif', value: kpi['total_titles'], source: 'book_titles' }, { indicator: 'Eksemplar aktif', value: kpi['total_copies'], source: 'book_copies' }, { indicator: 'Anggota aktif', value: members.count ?? 0, source: 'members' }, { indicator: 'Koleksi digital terbit', value: digital.count ?? 0, source: 'digital_collections' }, { indicator: 'Item dipinjam periode ini', value: sum(dashboard.charts.loans as Record<string, unknown>[], 'items_borrowed'), source: 'loans dan loan_items' }, { indicator: 'Total peserta kunjungan', value: (visits.data ?? []).reduce((total, row) => total + Number(row.individual_visits) + Number(row.group_participants), 0), source: 'visits dan group_visits' }, { indicator: 'Pembayaran denda periode ini', value: sum((payments.data ?? []) as Record<string, unknown>[], 'amount'), source: 'fine_payments' }, { indicator: 'Buku rusak', value: kpi['damaged_copies'], source: 'book_copies' }, { indicator: 'Buku hilang', value: kpi['lost_copies'], source: 'book_copies' },
    ];
    return result('accreditation', 'Ringkasan Pendukung Akreditasi', [{ key: 'indicator', label: 'Indikator' }, { key: 'value', label: 'Nilai', type: 'number' }, { key: 'source', label: 'Sumber Data' }], rows, filters, { indicators: rows.length, note: 'Ringkasan generik; pemetaan instrumen resmi dilakukan setelah format akreditasi diterima.' });
  }
}

function result(kind: ReportKind, title: string, columns: ReportColumn[], rows: Record<string, unknown>[], filters: ReportFilters, summary: Record<string, string | number>): ReportResult { return { kind, title, columns, rows: rows.slice(0, filters.limit), summary, filters }; }
function record(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function relation(value: unknown) { return record(Array.isArray(value) ? value[0] : value); }
function relations(value: unknown) { return Array.isArray(value) ? value.map(record) : []; }
function nullable(value: unknown) { return typeof value === 'string' && value ? value : null; }
function start(date: string) { return new Date(`${date}T00:00:00+07:00`).toISOString(); }
function end(date: string) { return new Date(`${date}T23:59:59.999+07:00`).toISOString(); }
function safe(value: string) { return value.replace(/[,%()]/g, ' ').trim(); }
function filterRows<T extends Record<string, unknown>>(rows: T[], filters: ReportFilters): T[] { if (!filters.search) return rows; const term = filters.search.toLocaleLowerCase('id'); return rows.filter((row) => JSON.stringify(row).toLocaleLowerCase('id').includes(term)); }
function dataRows<T extends Record<string, unknown>>(rows: T[], filters: ReportFilters) { return filterRows(rows, filters); }
function sum(rows: Record<string, unknown>[], key: string) { return rows.reduce((total, row) => total + Number(row[key] ?? 0), 0); }
function unavailable(message: string) { return new AppError(503, 'REPORT_UNAVAILABLE', message); }
