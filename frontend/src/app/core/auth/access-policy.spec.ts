import { navigationGroupsForRole, roleCan, roleHomePath } from './access-policy';

describe('role access policy', () => {
  it('keeps master admin in administration and monitoring only', () => {
    const labels = navigationGroupsForRole('master_admin').flatMap((group) =>
      group.items.map((item) => item.label),
    );

    expect(labels).toContain('Pengguna & role');
    expect(labels).toContain('Status sistem');
    expect(labels).not.toContain('Sirkulasi');
    expect(roleCan('master_admin', 'operations.write')).toBe(false);
  });

  it('gives head librarian read-only operations and librarian write operations', () => {
    expect(roleCan('head_librarian', 'operations.read')).toBe(true);
    expect(roleCan('head_librarian', 'operations.write')).toBe(false);
    expect(roleCan('librarian', 'operations.write')).toBe(true);
  });

  it('routes guest accounts to the public catalog', () => {
    expect(roleHomePath('guest')).toBe('/katalog');
  });
});
