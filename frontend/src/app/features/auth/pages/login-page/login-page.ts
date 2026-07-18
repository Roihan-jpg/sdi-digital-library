import { Component } from '@angular/core';

@Component({
  selector: 'sdi-login-page',
  template: `
    <section class="page login">
      <div class="card">
        <p class="eyebrow">Akses akun</p>
        <h1>Masuk ke SDI Digital Library</h1>
        <p>
          Form login Supabase akan diaktifkan pada tahap autentikasi. Tidak ada kredensial yang
          disimpan oleh halaman fondasi ini.
        </p>
        <button class="button" type="button" disabled aria-describedby="login-note">Masuk</button>
        <small id="login-note">Autentikasi belum diaktifkan.</small>
      </div>
    </section>
  `,
  styles: `
    .login {
      display: grid;
      place-items: center;
      min-height: 65dvh;
    }
    .card {
      width: min(30rem, 100%);
      padding: 2rem;
      border: 1px solid #d3dfd7;
      border-radius: 1rem;
      background: #fff;
    }
    h1 {
      margin-top: 0;
    }
    p {
      color: #506158;
      line-height: 1.6;
    }
    button {
      width: 100%;
      margin-top: 1rem;
    }
    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    small {
      display: block;
      margin-top: 0.5rem;
      color: #506158;
    }
  `,
})
export class LoginPage {}
