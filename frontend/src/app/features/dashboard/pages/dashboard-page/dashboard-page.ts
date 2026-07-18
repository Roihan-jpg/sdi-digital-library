import { Component } from '@angular/core';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';

@Component({
  selector: 'sdi-dashboard-page',
  imports: [EmptyState],
  template: `
    <section class="page">
      <p class="eyebrow">Dashboard</p>
      <h1>Ringkasan perpustakaan</h1>
      <sdi-empty-state
        title="Belum ada data operasional"
        description="Statistik akan berasal dari transaksi nyata setelah modul terkait tersedia."
      />
    </section>
  `,
  styles: `
    sdi-empty-state {
      display: block;
      margin-top: 2rem;
    }
  `,
})
export class DashboardPage {}
