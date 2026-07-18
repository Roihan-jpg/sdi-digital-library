import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'sdi-not-found-page',
  imports: [RouterLink],
  template: `
    <section class="page">
      <p class="eyebrow">404</p>
      <h1>Halaman tidak ditemukan</h1>
      <p>Alamat yang dibuka tidak tersedia atau sudah berubah.</p>
      <a class="button" routerLink="/">Kembali ke beranda</a>
    </section>
  `,
  styles: `
    .button {
      margin-top: 1rem;
    }
  `,
})
export class NotFoundPage {}
