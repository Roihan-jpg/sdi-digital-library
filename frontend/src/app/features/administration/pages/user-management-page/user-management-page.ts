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
          <p>Buat akun lokal, atur akses, hubungkan member, dan atur ulang kata sandi.</p>
        </div>
        <button class="secondary" type="button" (click)="load()">Muat ulang</button>
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
        <label><span>Nama lengkap</span><input formControlName="fullName" /></label>
        <label
          ><span>Username</span><input formControlName="username" autocomplete="username"
        /></label>
        <label
          ><span>Role</span
          ><select formControlName="role">
            @for (role of roles; track role.value) {
              <option [value]="role.value">{{ role.label }}</option>
            }
          </select></label
        >
        <label
          ><span>Kata sandi sementara</span
          ><input type="password" formControlName="password" autocomplete="new-password" /><small
            >Minimal 8 karakter: huruf besar, huruf kecil, dan angka.</small
          ></label
        >
        <label
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
          <label>
            <span>Nama lengkap</span>
            <input formControlName="fullName" autocomplete="name" />
          </label>
          <label>
            <span>Username</span>
            <input formControlName="username" autocomplete="username" />
          </label>
          <label>
            <span>Role</span>
            <select formControlName="role">
              @for (role of roles; track role.value) {
                <option [value]="role.value">{{ role.label }}</option>
              }
            </select>
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
          <label class="search"
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
                      @if (user.mustChangePassword) {
                        <em>Wajib ganti kata sandi</em>
                      }
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
                      <button
                        class="status"
                        type="button"
                        [class.inactive]="!user.isActive"
                        (click)="toggleStatus(user)"
                      >
                        {{ user.isActive ? 'Aktif' : 'Nonaktif' }}
                      </button>
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
                          <button class="link" type="button" (click)="startEdit(user)">Edit</button>
                          <button class="link danger" type="button" (click)="deleteUser(user)">
                            Hapus
                          </button>
                        </div>
                        <button class="link" type="button" (click)="resetPassword(user)">
                          Atur ulang kata sandi
                        </button>
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
          <label
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
    label {
      display: grid;
      gap: var(--space-2);
      font-weight: 700;
    }
    input,
    select {
      font: inherit;
      padding: var(--space-3);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-surface);
      color: var(--color-text);
    }
    .primary,
    .secondary,
    .status {
      border: 0;
      min-height: var(--control-height);
      padding: 0.65rem var(--space-4);
      border-radius: var(--radius-md);
      font-weight: 800;
      cursor: pointer;
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
    .status {
      background: var(--color-success-surface);
      color: var(--color-success);
    }
    .status.inactive {
      background: var(--color-error-surface);
      color: var(--color-error);
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
      gap: var(--space-3);
    }
    .link.danger {
      color: var(--color-danger);
    }
    .edit-panel {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(180px, 0.7fr) auto;
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
  `,
})
export class UserManagementPage {
  private readonly api = inject(AdministrationApiService);
  protected readonly roles = roles;
  protected readonly users = signal<ManagedProfile[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly editing = signal(false);
  protected readonly linking = signal(false);
  protected readonly message = signal('');
  protected readonly hasError = signal(false);
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
  });
  constructor() {
    void this.load();
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
      return this.show('Kata sandi sementara belum memenuhi ketentuan.', true);
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
    });
  }
  protected cancelEdit() {
    this.editTarget.set(null);
    this.editForm.reset({ fullName: '', username: '', role: 'member' });
  }
  protected async saveEdit() {
    const target = this.editTarget();
    if (!target || this.editForm.invalid) {
      this.show('Lengkapi nama, username, dan role yang valid.', true);
      return;
    }
    const value = this.editForm.getRawValue();
    this.editing.set(true);
    try {
      await firstValueFrom(this.api.updateUser(target.id, value));
      this.show('Data pengguna berhasil diperbarui.', false);
      this.cancelEdit();
      await this.load();
    } catch (error) {
      this.show(
        apiMessage(error, 'Data pengguna belum dapat diperbarui. Periksa username dan role.'),
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
  protected async toggleStatus(user: ManagedProfile) {
    try {
      await firstValueFrom(this.api.setStatus(user.id, !user.isActive));
      this.show('Status akun diperbarui.', false);
      await this.load();
    } catch (error) {
      this.show(apiMessage(error, 'Status akun belum dapat diperbarui. Coba kembali.'), true);
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
  protected async resetPassword(user: ManagedProfile) {
    const password = window.prompt(
      'Masukkan kata sandi baru (minimal 8 karakter, huruf besar, huruf kecil, dan angka).',
    );
    if (!password) return;
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password)) {
      this.show('Kata sandi belum memenuhi ketentuan.', true);
      return;
    }
    try {
      await firstValueFrom(this.api.setPassword(user.id, password));
      this.show('Kata sandi berhasil diatur ulang.', false);
    } catch (error) {
      this.show(apiMessage(error, 'Kata sandi belum dapat diatur ulang. Coba kembali.'), true);
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
