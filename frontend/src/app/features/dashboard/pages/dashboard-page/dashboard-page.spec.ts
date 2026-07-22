import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { AuthStore } from '../../../../core/auth/auth.store';
import { ReportApiService } from '../../../reports/data-access/report-api.service';
import type { DashboardData } from '../../../reports/models/report.model';
import { DashboardPage } from './dashboard-page';

const dashboardData: DashboardData = {
  kpis: {
    total_titles: 125,
    total_copies: 420,
    available_copies: 300,
    loaned_copies: 80,
    pending_reservations: 2,
    overdue_items: 1,
    damaged_copies: 3,
    lost_copies: 1,
    visits_today: 24,
    outstanding_fines: 12000,
  },
  charts: {
    loans: [
      { activity_date: '2026-07-01', loan_transactions: 2, items_borrowed: 5 },
      { activity_date: '2026-07-02', loan_transactions: 1, items_borrowed: 3 },
    ],
    visits: [
      {
        visit_date: '2026-07-01',
        individual_visits: 8,
        group_visits: 1,
        group_participants: 20,
      },
    ],
  },
  period: { from: '2026-07-01', to: '2026-07-07' },
};

function setup(role: 'librarian' | 'guest' = 'librarian') {
  const queryParamMap = convertToParamMap({ from: '2026-07-01', to: '2026-07-07' });
  const dashboard = vi.fn(() => of({ data: dashboardData }));
  const navigate = vi.fn(() => Promise.resolve(true));

  TestBed.configureTestingModule({
    imports: [DashboardPage],
    providers: [
      {
        provide: ActivatedRoute,
        useValue: {
          queryParamMap: of(queryParamMap),
          snapshot: {
            data: { heading: role === 'guest' ? 'Portal Tamu' : 'Operasional Perpustakaan' },
            queryParamMap,
          },
        },
      },
      {
        provide: AuthStore,
        useValue: {
          currentRole: () => role,
          displayName: () => (role === 'guest' ? 'Tamu Demo' : 'Petugas Demo'),
        },
      },
      { provide: ReportApiService, useValue: { dashboard } },
      { provide: Router, useValue: { navigate } },
    ],
  });

  const fixture = TestBed.createComponent(DashboardPage);
  fixture.detectChanges();
  return { fixture, dashboard, navigate };
}

describe('DashboardPage', () => {
  it('renders KPI context, chart summaries, and accessible chart descriptions', () => {
    const { fixture, dashboard } = setup();
    const element: HTMLElement = fixture.nativeElement;

    expect(dashboard).toHaveBeenCalledTimes(1);
    expect(element.textContent).toContain('Reservasi pending');
    expect(element.textContent).toContain('2');
    expect(element.textContent).toContain('8 eksemplar dipinjam');
    expect(element.textContent).toContain('28 pengunjung tercatat');
    expect(element.querySelector('[role="img"]')?.getAttribute('aria-label')).toContain(
      'Grafik peminjaman',
    );
    expect(element.querySelector('caption')?.textContent).toContain('Data peminjaman harian');
  });

  it('does not request dashboard data again when the selected period is already loaded', () => {
    const { fixture, dashboard, navigate } = setup();
    const component = fixture.componentInstance as unknown as { applyPeriod(): void };

    component.applyPeriod();
    fixture.detectChanges();

    expect(dashboard).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Periode ini sudah tampil.');
  });

  it('keeps the guest portal free from restricted dashboard requests', () => {
    const { fixture, dashboard } = setup('guest');

    expect(dashboard).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Portal tamu tersedia');
    expect(fixture.nativeElement.textContent).not.toContain('Dashboard belum dapat dimuat');
  });
});
