import type { ReportFilters, ReportKind } from './report.schema.js';

export interface ReportColumn {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'currency' | 'date';
}

export interface ReportResult {
  kind: ReportKind;
  title: string;
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
  summary: Record<string, string | number>;
  filters: ReportFilters;
}

export interface SchoolIdentity {
  schoolName: string;
  schoolAddress: string | null;
  schoolPhone: string | null;
  schoolEmail: string | null;
  schoolLogoPath: string | null;
}
