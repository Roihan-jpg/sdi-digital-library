import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AdministrationApiService } from '../../data-access/administration-api.service';
import { UserManagementPage } from './user-management-page';

const user = {
  id: '33333333-3333-4333-8333-333333333333',
  email: null,
  username: 'roihan_faqih',
  authSource: 'local' as const,
  fullName: 'Roihan Faqih',
  role: 'member' as const,
  isActive: true,
  createdAt: '2026-08-19T00:00:00.000Z',
  lastSignInAt: null,
  invitedAt: null,
  member: {
    id: '44444444-4444-4444-8444-444444444444',
    memberCode: 'AUTO-MEMBER-33333333-3333-4333-8333-333333333333',
    fullName: 'Roihan Faqih',
  },
};

function setup() {
  const api = {
    listUsers: vi.fn(() => of({ data: [user], pagination: { page: 1, limit: 100, total: 1 } })),
    listMemberLinkCandidates: vi.fn(() =>
      of({
        data: [
          {
            id: '55555555-5555-4555-8555-555555555555',
            memberCode: 'M-0001',
            fullName: 'Siswa Uji',
            isStudent: true,
          },
        ],
        pagination: { page: 1, limit: 20, total: 1 },
      }),
    ),
  };
  TestBed.configureTestingModule({
    imports: [UserManagementPage],
    providers: [
      {
        provide: AdministrationApiService,
        useValue: api,
      },
    ],
  });
  const fixture = TestBed.createComponent(UserManagementPage);
  fixture.detectChanges();
  return { fixture, api };
}

describe('UserManagementPage', () => {
  it('keeps a manual member-link action available for a provisional member account', async () => {
    const { fixture, api } = setup();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Akun ber-role member otomatis memperoleh data anggota sementara.',
    );
    expect(fixture.nativeElement.textContent).toContain('Hubungkan member');
    expect(fixture.nativeElement.querySelector('button.link')).not.toBeNull();

    const linkButton = fixture.nativeElement.querySelector(
      'button.link',
    ) as HTMLButtonElement | null;
    linkButton?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(api.listMemberLinkCandidates).toHaveBeenCalledWith('');
    expect(fixture.nativeElement.textContent).toContain('Siswa Uji');
  });
});
