import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import type { AppRole } from '../../../../core/auth/auth.models';
import {
  AdministrationApiService,
  type ManagedProfile,
} from '../../data-access/administration-api.service';

const roles: Array<{ value: AppRole; label: string }> = [
  { value: 'master_admin', label: 'Master admin' },
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
          <p>Buat akun, atur akses, hubungkan member, dan kirim pemulihan akun.</p>
        </div>
        <button class="secondary" type="button" (click)="load()">Muat ulang</button>
      </header>
      @if (message()) {
        <div class="notice" [class.error]="hasError()" role="status">{{ message() }}</div>
      }
      <form class="panel form" [formGroup]="createForm" (ngSubmit)="create()" novalidate>
        <div class="panel-title">
          <div>
            <p class="eyebrow">Akun baru</p>
            <h2>Tambahkan pengguna</h2>
          </div>
        </div>
        <label><span>Nama lengkap</span><input formControlName="fullName" /></label>
        <label><span>Email</span><input type="email" formControlName="email" /></label>
        <label
          ><span>Role</span
          ><select formControlName="role">
            @for (role of roles; track role.value) {
              <option [value]="role.value">{{ role.label }}</option>
            }
          </select></label
        >
        <label
          ><span>Pengiriman</span
          ><select formControlName="deliveryMode">
            <option value="invite">Undangan email</option>
            <option value="temporaryPassword">Kata sandi sementara</option>
          </select></label
        >
        @if (createForm.controls.deliveryMode.value === 'temporaryPassword') {
          <label
            ><span>Kata sandi sementara</span
            ><input
              type="password"
              formControlName="temporaryPassword"
              autocomplete="new-password"
            /><small>Minimal 12 karakter: huruf besar/kecil, angka, dan simbol.</small></label
          >
        }
        <label
          ><span>ID member (opsional)</span
          ><input formControlName="memberId" placeholder="UUID member"
        /></label>
        <button class="primary" type="submit" [disabled]="saving()">
          {{ saving() ? 'Membuat...' : 'Buat akun' }}
        </button>
      </form>

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
                      ><small>{{ user.email || 'Tanpa email' }}</small>
                      @if (user.mustChangePassword) {
                        <em>Wajib ganti kata sandi</em>
                      }
                    </td>
                    <td>
                      <select [value]="user.role" (change)="changeRole(user, $event)">
                        @for (role of roles; track role.value) {
                          <option [value]="role.value">{{ role.label }}</option>
                        }
                      </select>
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
                      <button class="link" type="button" (click)="invite(user)">
                        Kirim undangan</button
                      ><button class="link" type="button" (click)="recover(user)">
                        Reset kata sandi
                      </button>
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
      gap: 22px;
      color: #18354e;
    }
    header,
    .panel-title {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      align-items: start;
    }
    h1,
    h2 {
      margin: 0.25rem 0;
      color: #102f4d;
    }
    .eyebrow {
      margin: 0;
      color: #a5660b;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-size: 0.72rem;
    }
    .panel {
      background: #fff;
      border: 1px solid #dce2e5;
      padding: 22px;
      box-shadow: 0 8px 24px #17344d0d;
    }
    .form {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 15px;
    }
    .form .panel-title {
      grid-column: 1/-1;
    }
    .link-panel {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(260px, 0.8fr) auto;
      gap: 18px;
      align-items: end;
    }
    .link-panel p {
      margin-bottom: 0;
    }
    .link-actions {
      display: flex;
      gap: 8px;
    }
    label {
      display: grid;
      gap: 6px;
      font-weight: 700;
    }
    input,
    select {
      font: inherit;
      padding: 10px;
      border: 1px solid #aebac2;
      background: #fff;
    }
    .primary,
    .secondary,
    .status {
      border: 0;
      padding: 10px 14px;
      font-weight: 800;
      cursor: pointer;
    }
    .primary {
      background: #123a5d;
      color: #fff;
      align-self: end;
    }
    .secondary {
      background: #e8eef2;
      color: #123a5d;
    }
    .notice {
      padding: 12px;
      border-left: 4px solid #20805d;
      background: #edf8f3;
    }
    .notice.error {
      border-color: #b23b2c;
      background: #fff0ed;
    }
    .search {
      min-width: 260px;
    }
    .table-wrap {
      overflow: auto;
      margin-top: 16px;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      min-width: 900px;
    }
    th,
    td {
      padding: 12px;
      border-bottom: 1px solid #e1e5e7;
      text-align: left;
      vertical-align: top;
    }
    td strong,
    td small,
    td em {
      display: block;
    }
    td small {
      color: #647582;
    }
    .status {
      background: #e7f5ef;
      color: #17664a;
    }
    .status.inactive {
      background: #f4e5e3;
      color: #8b3026;
    }
    .link {
      display: block;
      border: 0;
      background: none;
      color: #0d5e92;
      text-decoration: underline;
      padding: 4px 0;
      cursor: pointer;
    }
    .state {
      padding: 35px;
      text-align: center;
      color: #647582;
    }
    @media (max-width: 850px) {
      .form {
        grid-template-columns: 1fr;
      }
      .link-panel {
        grid-template-columns: 1fr;
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
  protected readonly linking = signal(false);
  protected readonly message = signal('');
  protected readonly hasError = signal(false);
  protected readonly search = new FormControl('', { nonNullable: true });
  protected readonly linkTarget = signal<ManagedProfile | null>(null);
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
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    role: new FormControl<AppRole>('member', { nonNullable: true }),
    deliveryMode: new FormControl<'invite' | 'temporaryPassword'>('invite', { nonNullable: true }),
    temporaryPassword: new FormControl('', { nonNullable: true }),
    memberId: new FormControl('', { nonNullable: true }),
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
    } catch {
      this.show('Daftar pengguna belum dapat dimuat.', true);
    } finally {
      this.loading.set(false);
    }
  }
  protected async create() {
    if (this.createForm.invalid) return this.show('Lengkapi nama dan email yang valid.', true);
    const value = this.createForm.getRawValue();
    if (
      value.deliveryMode === 'temporaryPassword' &&
      !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/.test(value.temporaryPassword)
    )
      return this.show('Kata sandi sementara belum memenuhi ketentuan.', true);
    const input: Record<string, unknown> = {
      email: value.email,
      fullName: value.fullName,
      role: value.role,
      deliveryMode: value.deliveryMode,
    };
    if (value.memberId) input['memberId'] = value.memberId;
    if (value.deliveryMode === 'temporaryPassword')
      input['temporaryPassword'] = value.temporaryPassword;
    this.saving.set(true);
    try {
      await firstValueFrom(this.api.createUser(input));
      this.createForm.reset({
        fullName: '',
        email: '',
        role: 'member',
        deliveryMode: 'invite',
        temporaryPassword: '',
        memberId: '',
      });
      this.show('Akun berhasil dibuat.', false);
      await this.load();
    } catch {
      this.show('Akun belum dapat dibuat. Periksa email, role, dan ID member.', true);
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
    } catch {
      this.show('Role belum dapat diperbarui.', true);
      await this.load();
    }
  }
  protected async toggleStatus(user: ManagedProfile) {
    try {
      await firstValueFrom(this.api.setStatus(user.id, !user.isActive));
      this.show('Status akun diperbarui.', false);
      await this.load();
    } catch {
      this.show('Status akun belum dapat diperbarui.', true);
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
    } catch {
      this.show('Member belum dapat dihubungkan.', true);
    } finally {
      this.linking.set(false);
    }
  }
  protected async invite(user: ManagedProfile) {
    try {
      await firstValueFrom(this.api.sendInvitation(user.id));
      this.show('Email undangan dikirim.', false);
    } catch {
      this.show('Undangan belum dapat dikirim.', true);
    }
  }
  protected async recover(user: ManagedProfile) {
    try {
      await firstValueFrom(this.api.sendRecovery(user.id));
      this.show('Email pemulihan dikirim.', false);
    } catch {
      this.show('Email pemulihan belum dapat dikirim.', true);
    }
  }
  private show(message: string, error: boolean) {
    this.message.set(message);
    this.hasError.set(error);
  }
}
