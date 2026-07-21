export type ReportKind =
  | 'popular-books'
  | 'active-students'
  | 'overdue'
  | 'fines'
  | 'damaged-lost'
  | 'inventory'
  | 'visits'
  | 'digital-activity'
  | 'accreditation';

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
}
export interface DashboardData {
  kpis: {
    total_titles: number;
    total_copies: number;
    available_copies: number;
    loaned_copies: number;
    pending_reservations: number;
    overdue_items: number;
    damaged_copies: number;
    lost_copies: number;
    visits_today: number;
    outstanding_fines: number;
  };
  charts: {
    loans: { activity_date: string; loan_transactions: number; items_borrowed: number }[];
    visits: {
      visit_date: string;
      individual_visits: number;
      group_visits: number;
      group_participants: number;
    }[];
  };
  period: { from: string; to: string };
}
export interface SchoolIdentity {
  schoolName: string;
  schoolAddress: string | null;
  schoolPhone: string | null;
  schoolEmail: string | null;
  schoolLogoPath: string | null;
}
