import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'sdi-forbidden-page',
  imports: [RouterLink],
  template: `
    <section class="page">
      <p class="eyebrow">Akses dibatasi</p>
      <h1>Anda tidak memiliki izin untuk halaman ini</h1>
      <p>Menu dan data yang tersedia mengikuti role akun aktif Anda.</p>
      <a class="button" routerLink="/dashboard">Kembali ke dashboard</a>
    </section>
  `,
  styles: `
    .button {
      margin-top: 1rem;
    }
  `,
})
export class ForbiddenPage {}
