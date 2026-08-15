import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import type { AppRole } from '../../../../core/auth/auth.models';
import { parseApiError } from '../../../../core/errors/api-error';
import {
  AdministrationApiService,
  type ManagedProfile,
} from '../../data-access/administration-api.service';

const roles: Array<{ value: AppRole; label: string }> = [
  { value: 'head_librarian', label: 'Kepala perpustakaan' },
  { value: 'librarian', label: 'Pustakawan' },
  { value: 'member', label: 'Member' },
  { value: 'guest', label: 'Tamu' },
];

@Component({
  selector: 'sdi-user-management-page',
  imports: [ReactiveFormsModule],
  template: `
    <section class="admin-page">
      <header>
        <div>
          <p class="eyebrow">Administrasi akun</p>
          <h1>User dan role</h1>
          <p>Buat akun lokal, atur akses, hubungkan member, dan kelola kata sandi.</p>
        </div>
        <button
          class="icon-button refresh-button"
          type="button"
          [disabled]="loading()"
          aria-label="Muat ulang daftar pengguna"
          title="Muat ulang daftar pengguna"
          (click)="load()"
        >
          <svg
            class="refresh-icon"
            [class.is-spinning]="loading()"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path d="M20 11a8 8 0 0 0-14.8-4L4 9" />
            <path d="M4 4v5h5" />
            <path d="M4 13a8 8 0 0 0 14.8 4L20 15" />
            <path d="M20 20v-5h-5" />
          </svg>
        </button>
      </header>
      @if (message()) {
        <div
          class="notice"
          [class.error]="hasError()"
          [attr.role]="hasError() ? 'alert' : 'status'"
          aria-atomic="true"
        >
          {{ message() }}
        </div>
      }
      <form class="panel form" [formGroup]="createForm" (ngSubmit)="create()" novalidate>
        <div class="panel-title">
          <div>
            <p class="eyebrow">Akun baru</p>
            <h2>Tambahkan pengguna</h2>
          </div>
        </div>
        <label class="field"><span>Nama lengkap</span><input formControlName="fullName" /></label>
        <label
          class="field"
          ><span>Username</span><input formControlName="username" autocomplete="username"
        /></label>
        <label
          class="field"
          ><span>Role</span
          ><select formControlName="role">
            @for (role of roles; track role.value) {
              <option [value]="role.value">{{ role.label }}</option>
            }
          </select></label
        >
        <label
          class="field"
          ><span>Kata sandi awal</span
          ><span class="password-input"
            ><input
              id="create-password"
              [type]="showInitialPassword() ? 'text' : 'password'"
              formControlName="password"
              autocomplete="new-password"
            /><button
              class="password-toggle"
              type="button"
              aria-controls="create-password"
              [attr.aria-pressed]="showInitialPassword()"
              [attr.aria-label]="
                showInitialPassword() ? 'Sembunyikan kata sandi awal' : 'Tampilkan kata sandi awal'
              "
              (click)="toggleInitialPasswordVisibility()"
            >
              @if (showInitialPassword()) {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                  <path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.2A10.8 10.8 0 0 1 12 5c5 0 8.5 3.8 9.5 7a10.5 10.5 0 0 1-3.1 4.8M6.2 6.2C4.3 7.5 3.1 9.4 2.5 12c1 3.2 4.5 7 9.5 7 1.1 0 2.1-.2 3-.5" />
                </svg>
              } @else {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                  <path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              }
            </button></span
          ><small
            >Minimal 8 karakter: huruf besar, huruf kecil, dan angka.</small
          ></label
        >
        <label
          class="field"
          ><span>ID member (opsional)</span
          ><input formControlName="memberId" placeholder="UUID member"
        /></label>
        <button class="primary" type="submit" [disabled]="saving()">
          {{ saving() ? 'Membuat...' : 'Buat akun' }}
        </button>
      </form>

      @if (editTarget(); as target) {
        <form class="panel edit-panel" [formGroup]="editForm" (ngSubmit)="saveEdit()" novalidate>
          <div class="panel-title">
            <div>
              <p class="eyebrow">Edit akun</p>
              <h2>{{ target.fullName || target.username || 'Pengguna' }}</h2>
            </div>
            <button class="secondary" type="button" [disabled]="editing()" (click)="cancelEdit()">
              Batal
            </button>
          </div>
          <label class="field">
            <span>Nama lengkap</span>
            <input formControlName="fullName" autocomplete="name" />
          </label>
          <label class="field">
            <span>Username</span>
            <input formControlName="username" autocomplete="username" />
          </label>
          <label class="field">
            <span>Role</span>
            <select formControlName="role">
              @for (role of roles; track role.value) {
                <option [value]="role.value">{{ role.label }}</option>
              }
            </select>
          </label>
          <label class="field">
            <span>Kata sandi baru (opsional)</span>
            <input type="password" formControlName="password" autocomplete="new-password" />
            <small>Isi hanya jika ingin mengubah kata sandi.</small>
          </label>
          <button class="primary" type="submit" [disabled]="editing()">
            {{ editing() ? 'Menyimpan...' : 'Simpan perubahan' }}
          </button>
        </form>
      }

      <section class="panel">
        <div class="panel-title">
          <div>
            <p class="eyebrow">Direktori</p>
            <h2>Daftar pengguna</h2>
          </div>
          <label class="search field"
            ><span>Cari</span
            ><input [formControl]="search" (keydown.enter)="load()" placeholder="Nama atau email"
          /></label>
        </div>
        @if (loading()) {
          <p class="state">Memuat akun...</p>
        } @else if (users().length === 0) {
          <p class="state">Tidak ada akun yang cocok.</p>
        } @else {
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Pengguna</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Member</th>
                  <th>Aksi akun</th>
                </tr>
              </thead>
              <tbody>
                @for (user of users(); track user.id) {
                  <tr>
                    <td>
                      <strong>{{ user.fullName || 'Tanpa nama' }}</strong
                      ><small>{{ user.username || user.email || 'Tanpa username' }}</small>
                    </td>
                    <td>
                      @if (user.authSource === 'local') {
                        <select [value]="user.role" (change)="changeRole(user, $event)">
                          @for (role of roles; track role.value) {
                            <option [value]="role.value" [selected]="role.value === user.role">
                              {{ role.label }}
                            </option>
                          }
                        </select>
                      } @else {
                        <span>Master admin (Supabase Auth)</span>
                      }
                    </td>
                    <td>
                      <label class="switch">
                        <input
                          type="checkbox"
                          [checked]="user.isActive"
                          [disabled]="statusUpdatingId() === user.id"
                          [attr.aria-label]="
                            user.isActive
                              ? 'Nonaktifkan akun ' + (user.fullName || user.username || 'pengguna')
                              : 'Aktifkan akun ' + (user.fullName || user.username || 'pengguna')
                          "
                          (change)="toggleStatus(user, $event)"
                        />
                        <span class="slider">
                          <svg
                            class="slider-icon"
                            viewBox="0 0 32 32"
                            xmlns="http://www.w3.org/2000/svg"
                            aria-hidden="true"
                            role="presentation"
                          >
                            <path fill="none" d="m4 16.5 8 8 16-16"></path>
                          </svg>
                        </span>
                      </label>
                    </td>
                    <td>
                      <span>{{ user.member?.memberCode || 'Belum terhubung' }}</span
                      ><button class="link" type="button" (click)="startMemberLink(user)">
                        Hubungkan
                      </button>
                    </td>
                    <td>
                      @if (user.authSource === 'local') {
                        <div class="account-actions">
                          <button
                            class="icon-action"
                            type="button"
                            [attr.aria-label]="
                              'Edit akun ' + (user.fullName || user.username || 'pengguna')
                            "
                            title="Edit akun"
                            (click)="startEdit(user)"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                              <path d="m4 16.5-.8 3.8 3.8-.8L18.5 8a2.8 2.8 0 0 0-4-4L4 16.5Z" />
                              <path d="m13 5 6 6" />
                            </svg>
                          </button>
                          <button
                            class="icon-action danger"
                            type="button"
                            [attr.aria-label]="
                              'Hapus akun ' + (user.fullName || user.username || 'pengguna')
                            "
                            title="Hapus akun"
                            (click)="deleteUser(user)"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                              <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
                            </svg>
                          </button>
                        </div>
                      } @else {
                        <small>Dikelola di Supabase Auth</small>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>
      @if (linkTarget(); as target) {
        <form class="panel link-panel" (ngSubmit)="confirmMemberLink()" novalidate>
          <div>
            <p class="eyebrow">Tautkan member</p>
            <h2>{{ target.fullName || target.email }}</h2>
            <p>
              Masukkan UUID member yang sudah ada. Satu akun hanya dapat terhubung ke satu member.
            </p>
          </div>
          <label class="field"
            ><span>ID member</span><input [formControl]="linkMemberId" autocomplete="off"
          /></label>
          <div class="link-actions">
            <button class="primary" type="submit" [disabled]="linking()">
              {{ linking() ? 'Menghubungkan...' : 'Hubungkan member' }}
            </button>
            <button
              class="secondary"
              type="button"
              [disabled]="linking()"
              (click)="cancelMemberLink()"
            >
              Batal
            </button>
          </div>
        </form>
      }
    </section>
  `,
  styles: `
    :host {
      display: block;
    }
    .admin-page {
      display: grid;
      gap: var(--space-6);
      width: min(var(--container-wide), calc(100% - 2 * var(--page-gutter)));
      margin-inline: auto;
      padding-block: clamp(1.25rem, 2.6vw, 2.5rem);
      color: var(--color-text);
    }
    header,
    .panel-title {
      display: flex;
      justify-content: space-between;
      gap: var(--space-5);
      align-items: start;
    }
    h1,
    h2 {
      margin: 0.25rem 0;
      color: var(--color-text);
    }
    .eyebrow {
      margin: 0;
      color: var(--color-brand-800);
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-size: 0.72rem;
    }
    .panel {
      padding: var(--space-6);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-surface);
      box-shadow: var(--shadow-sm);
    }
    .form {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: var(--space-4);
    }
    .form .panel-title {
      grid-column: 1/-1;
    }
    .link-panel {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(260px, 0.8fr) auto;
      gap: var(--space-4);
      align-items: end;
    }
    .link-panel p {
      margin-bottom: 0;
    }
    .link-actions {
      display: flex;
      gap: var(--space-2);
    }
    .field {
      display: grid;
      gap: var(--space-2);
      color: var(--color-text);
      font-size: 0.8rem;
      font-weight: 400;
    }
    .field small {
      color: var(--color-text-muted);
      font-size: 0.72rem;
      font-weight: 400;
    }
    .password-input {
      position: relative;
      display: block;
    }
    .password-input input {
      width: 100%;
      padding-right: 3.25rem;
    }
    .password-toggle {
      position: absolute;
      top: 50%;
      right: 0.25rem;
      display: grid;
      place-items: center;
      width: 44px;
      height: 44px;
      min-height: 44px;
      transform: translateY(-50%);
      border: 0;
      border-radius: 50%;
      background: transparent;
      color: var(--color-text-muted);
      cursor: pointer;
    }
    .password-toggle:hover {
      background: var(--color-surface-hover);
      color: var(--color-text);
    }
    .password-toggle svg {
      width: 1.15rem;
      height: 1.15rem;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.7;
    }
    input:not([type='checkbox']),
    select {
      font: inherit;
      font-weight: 400;
      padding: var(--space-3);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-surface);
      color: var(--color-text);
    }
    .primary,
    .secondary {
      border: 0;
      min-height: var(--control-height);
      padding: 0.65rem var(--space-4);
      border-radius: var(--radius-md);
      font-weight: 800;
      cursor: pointer;
    }
    .primary:disabled,
    .secondary:disabled,
    .icon-button:disabled,
    .icon-action:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }
    .primary {
      background: var(--color-action-primary);
      color: var(--color-text-inverse);
      align-self: end;
    }
    .secondary {
      border: 1px solid var(--color-border-strong);
      background: var(--color-surface);
      color: var(--color-brand-800);
    }
    .icon-button,
    .icon-action {
      display: inline-grid;
      place-items: center;
      width: 44px;
      min-width: 44px;
      height: 44px;
      min-height: 44px;
      border: 1px solid var(--color-border-strong);
      border-radius: 50%;
      background: var(--color-surface);
      color: var(--color-brand-800);
      cursor: pointer;
    }
    .icon-button:hover:not(:disabled),
    .icon-action:hover:not(:disabled) {
      background: var(--color-surface-hover);
      border-color: var(--color-brand-700);
    }
    .refresh-icon,
    .icon-action svg {
      width: 1.2rem;
      height: 1.2rem;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.8;
    }
    .refresh-icon.is-spinning {
      animation: refresh-spin 0.9s linear infinite;
    }
    @keyframes refresh-spin {
      to {
        transform: rotate(360deg);
      }
    }
    .notice {
      padding: var(--space-3);
      border-left: 4px solid var(--color-success);
      border-radius: var(--radius-md);
      background: var(--color-success-surface);
      color: var(--color-success);
    }
    .notice.error {
      border-color: var(--color-error);
      background: var(--color-error-surface);
      color: var(--color-error);
    }
    .search {
      min-width: 260px;
    }
    .table-wrap {
      overflow: auto;
      margin-top: var(--space-4);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
    }
    table {
      border-collapse: collapse;
      width: 100%;
      min-width: 900px;
    }
    th,
    td {
      padding: var(--space-3);
      border-bottom: 1px solid var(--color-border);
      text-align: left;
      vertical-align: top;
    }
    td strong,
    td small,
    td em {
      display: block;
    }
    td small {
      color: var(--color-text-muted);
    }
    .link {
      display: block;
      border: 0;
      background: none;
      color: var(--color-info);
      text-decoration: underline;
      padding: 4px 0;
      cursor: pointer;
    }
    .account-actions {
      display: flex;
      gap: var(--space-2);
      align-items: center;
    }
    .icon-action.danger {
      color: var(--color-danger);
      border-color: var(--color-danger-surface);
      background: var(--color-danger-surface);
    }
    .icon-action.danger:hover:not(:disabled) {
      background: var(--color-danger-surface-hover);
    }
    .switch {
      position: relative;
      display: inline-block;
      width: 3.5em;
      height: 2em;
      font-size: 17px;
    }
    .switch input {
      position: absolute;
      width: 0;
      height: 0;
      opacity: 0;
    }
    .slider {
      position: absolute;
      inset: 0;
      cursor: pointer;
      border: 1px solid var(--color-border-strong);
      border-radius: 32px;
      outline: none;
      background: var(--color-surface-subtle);
      transition: 0.3s;
    }
    .slider::before {
      position: absolute;
      content: '';
      width: 2rem;
      height: 2rem;
      left: -1px;
      bottom: -1px;
      border-radius: 50%;
      outline: 2px solid var(--color-border-strong);
      background: var(--color-surface);
      transition: transform 0.25s ease-in-out;
    }
    .slider-icon {
      position: absolute;
      z-index: 1;
      top: 30%;
      right: 60%;
      width: 12px;
      height: 12px;
      opacity: 0;
      stroke: var(--color-text-inverse);
      stroke-width: 8;
      transition: right 0.3s ease-in-out, opacity 0.15s ease-in-out;
    }
    .switch input:checked + .slider {
      border-color: var(--color-action-primary);
      background: var(--color-action-primary);
    }
    .switch input:checked + .slider .slider-icon {
      right: 20%;
      opacity: 1;
    }
    .switch input:checked + .slider::before {
      transform: translateX(1.5em);
      outline-color: var(--color-action-primary);
    }
    .switch input:focus-visible + .slider {
      outline: 2px solid var(--color-accent);
      outline-offset: 3px;
      box-shadow: 0 0 0 3px var(--color-focus-outer);
    }
    .switch input:disabled + .slider {
      cursor: wait;
      opacity: 0.65;
    }
    .edit-panel {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr)) auto;
      gap: var(--space-4);
      align-items: end;
    }
    .edit-panel .panel-title {
      grid-column: 1 / -1;
    }
    .state {
      padding: 35px;
      text-align: center;
      color: var(--color-text-muted);
    }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
    @media (max-width: 850px) {
      .form {
        grid-template-columns: 1fr;
      }
      .link-panel {
        grid-template-columns: 1fr;
      }
      .edit-panel {
        grid-template-columns: 1fr;
      }
      .edit-panel .panel-title {
        grid-column: auto;
      }
      header,
      .panel-title {
        display: grid;
      }
      .search {
        min-width: 0;
      }
    }
    @media (max-width: 560px) {
      .panel {
        padding: var(--space-4);
      }
      .admin-page {
        width: min(100% - 1.25rem, var(--container-wide));
      }
      table {
        min-width: 780px;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .refresh-icon.is-spinning,
      .slider,
      .slider::before,
      .slider-icon {
        animation: none;
        transition: none;
      }
    }
  `,
})
export class UserManagementPage {
  private readonly api = inject(AdministrationApiService);
  protected readonly roles = roles;
  protected readonly users = signal<ManagedProfile[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly showInitialPassword = signal(false);
  protected readonly editing = signal(false);
  protected readonly linking = signal(false);
  protected readonly message = signal('');
  protected readonly hasError = signal(false);
  protected readonly statusUpdatingId = signal<string | null>(null);
  protected readonly search = new FormControl('', { nonNullable: true });
  protected readonly linkTarget = signal<ManagedProfile | null>(null);
  protected readonly editTarget = signal<ManagedProfile | null>(null);
  protected readonly linkMemberId = new FormControl('', {
    nonNullable: true,
    validators: [
      Validators.required,
      Validators.pattern(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      ),
    ],
  });
  protected readonly createForm = new FormGroup({
    fullName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
    username: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(3),
        Validators.pattern(/^[A-Za-z0-9][A-Za-z0-9._@-]*$/),
      ],
    }),
    role: new FormControl<AppRole>('member', { nonNullable: true }),
    password: new FormControl('', { nonNullable: true }),
    memberId: new FormControl('', { nonNullable: true }),
  });
  protected readonly editForm = new FormGroup({
    fullName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
    username: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(3),
        Validators.pattern(/^[A-Za-z0-9][A-Za-z0-9._@-]*$/),
      ],
    }),
    role: new FormControl<AppRole>('member', { nonNullable: true }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/)],
    }),
  });
  constructor() {
    void this.load();
  }
  protected toggleInitialPasswordVisibility() {
    this.showInitialPassword.update((visible) => !visible);
  }
  protected async load() {
    this.loading.set(true);
    try {
      const response = await firstValueFrom(
        this.api.listUsers({ search: this.search.value.trim() || undefined }),
      );
      this.users.set(response.data);
    } catch (error) {
      this.show(apiMessage(error, 'Daftar pengguna belum dapat dimuat. Coba kembali.'), true);
    } finally {
      this.loading.set(false);
    }
  }
  protected async create() {
    if (this.createForm.invalid) return this.show('Lengkapi nama dan username yang valid.', true);
    const value = this.createForm.getRawValue();
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(value.password))
      return this.show('Kata sandi awal belum memenuhi ketentuan.', true);
    const input: Record<string, unknown> = {
      username: value.username,
      fullName: value.fullName,
      role: value.role,
      password: value.password,
    };
    if (value.memberId) input['memberId'] = value.memberId;
    this.saving.set(true);
    try {
      await firstValueFrom(this.api.createUser(input));
      this.createForm.reset({
        fullName: '',
        username: '',
        role: 'member',
        password: '',
        memberId: '',
      });
      this.showInitialPassword.set(false);
      this.show('Akun berhasil dibuat.', false);
      await this.load();
    } catch (error) {
      this.show(
        apiMessage(error, 'Akun belum dapat dibuat. Periksa username, role, dan ID member.'),
        true,
      );
    } finally {
      this.saving.set(false);
    }
  }
  protected async changeRole(user: ManagedProfile, event: Event) {
    const role = (event.target as HTMLSelectElement).value as AppRole;
    try {
      await firstValueFrom(this.api.setRole(user.id, role));
      this.show('Role diperbarui.', false);
      await this.load();
    } catch (error) {
      this.show(apiMessage(error, 'Role belum dapat diperbarui. Coba kembali.'), true);
      await this.load();
    }
  }
  protected startEdit(user: ManagedProfile) {
    if (user.authSource !== 'local') return;
    this.editTarget.set(user);
    this.editForm.setValue({
      fullName: user.fullName ?? '',
      username: user.username ?? '',
      role: user.role === 'master_admin' ? 'member' : user.role,
      password: '',
    });
  }
  protected cancelEdit() {
    this.editTarget.set(null);
    this.editForm.reset({ fullName: '', username: '', role: 'member', password: '' });
  }
  protected async saveEdit() {
    const target = this.editTarget();
    if (!target || this.editForm.invalid) {
      this.show('Lengkapi data akun dan pastikan kata sandi baru memenuhi ketentuan.', true);
      return;
    }
    const value = this.editForm.getRawValue();
    const { password, ...account } = value;
    let accountSaved = false;
    this.editing.set(true);
    try {
      await firstValueFrom(this.api.updateUser(target.id, account));
      accountSaved = true;
      if (password) await firstValueFrom(this.api.updatePassword(target.id, password));
      this.show(
        password
          ? 'Data pengguna dan kata sandi berhasil diperbarui.'
          : 'Data pengguna berhasil diperbarui.',
        false,
      );
      this.cancelEdit();
      await this.load();
    } catch (error) {
      this.show(
        apiMessage(
          error,
          accountSaved
            ? 'Data pengguna tersimpan, tetapi kata sandi belum dapat diperbarui.'
            : 'Data pengguna belum dapat diperbarui. Periksa username dan role.',
        ),
        true,
      );
    } finally {
      this.editing.set(false);
    }
  }
  protected async deleteUser(user: ManagedProfile) {
    if (user.authSource !== 'local') return;
    const label = user.fullName || user.username || 'akun ini';
    if (
      !window.confirm(
        `Hapus ${label}? Histori transaksi yang menjadi tanggung jawab akun dapat mencegah penghapusan.`,
      )
    )
      return;
    try {
      await firstValueFrom(this.api.deleteUser(user.id));
      if (this.editTarget()?.id === user.id) this.cancelEdit();
      this.show('Akun berhasil dihapus.', false);
      await this.load();
    } catch (error) {
      this.show(
        apiMessage(
          error,
          'Akun tidak dapat dihapus. Jika memiliki histori transaksi, nonaktifkan akun.',
        ),
        true,
      );
    }
  }
  protected async toggleStatus(user: ManagedProfile, event: Event) {
    const isActive = (event.target as HTMLInputElement).checked;
    this.statusUpdatingId.set(user.id);
    try {
      await firstValueFrom(this.api.setStatus(user.id, isActive));
      this.show('Status akun diperbarui.', false);
      await this.load();
    } catch (error) {
      this.show(apiMessage(error, 'Status akun belum dapat diperbarui. Coba kembali.'), true);
      await this.load();
    } finally {
      this.statusUpdatingId.set(null);
    }
  }
  protected startMemberLink(user: ManagedProfile) {
    this.linkTarget.set(user);
    this.linkMemberId.setValue(user.member?.id ?? '');
  }
  protected cancelMemberLink() {
    this.linkTarget.set(null);
    this.linkMemberId.reset('');
  }
  protected async confirmMemberLink() {
    const target = this.linkTarget();
    if (!target || this.linkMemberId.invalid) {
      this.linkMemberId.markAsTouched();
      this.show('ID member harus berupa UUID yang valid.', true);
      return;
    }
    this.linking.set(true);
    try {
      await firstValueFrom(this.api.linkMember(target.id, this.linkMemberId.value.trim()));
      this.show('Akun terhubung ke member.', false);
      this.cancelMemberLink();
      await this.load();
    } catch (error) {
      this.show(
        apiMessage(error, 'Member belum dapat dihubungkan. Periksa ID lalu coba lagi.'),
        true,
      );
    } finally {
      this.linking.set(false);
    }
  }
  private show(message: string, error: boolean) {
    this.message.set(message);
    this.hasError.set(error);
  }
}

function apiMessage(error: unknown, fallback: string): string {
  const details = parseApiError(error, fallback);
  return details.requestId ? `${details.message} Referensi: ${details.requestId}` : details.message;
}
