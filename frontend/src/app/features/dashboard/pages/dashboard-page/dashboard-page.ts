import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthStore } from '../../../../core/auth/auth.store';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';

@Component({
  selector: 'sdi-dashboard-page',
  imports: [EmptyState],
  template: `
    <section class="page">
      <p class="eyebrow">{{ roleLabel() }}</p>
      <h1>{{ heading }}</h1>
      <p>Selamat datang, {{ authStore.displayName() }}.</p>
      <sdi-empty-state
        title="Modul siap dikembangkan"
        description="Hak akses dan navigasi sudah aktif. Data operasional akan berasal dari modul transaksi pada tahap berikutnya."
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
export class DashboardPage {
  protected readonly authStore = inject(AuthStore);
  private readonly route = inject(ActivatedRoute);
  protected readonly heading =
    (this.route.snapshot.data['heading'] as string | undefined) ?? 'Dashboard';

  protected roleLabel(): string {
    switch (this.authStore.currentRole()) {
      case 'master_admin':
        return 'Master Admin';
      case 'head_librarian':
        return 'Kepala Perpustakaan';
      case 'librarian':
        return 'Petugas Perpustakaan';
      case 'member':
        return 'Anggota Perpustakaan';
      case 'guest':
        return 'Tamu';
      default:
        return 'Dashboard';
    }
  }
}
