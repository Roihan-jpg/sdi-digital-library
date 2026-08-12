import { TestBed } from '@angular/core/testing';
import { ThemeToggle } from './theme-toggle';

describe('ThemeToggle', () => {
  beforeEach(() => localStorage.setItem('sdi-theme', 'light'));
  afterEach(() => localStorage.clear());

  it('toggles the shared application theme with an accessible state', async () => {
    await TestBed.configureTestingModule({ imports: [ThemeToggle] }).compileComponents();
    const fixture = TestBed.createComponent(ThemeToggle);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(button.getAttribute('aria-label')).toBe('Gunakan tema gelap');

    button.click();
    fixture.detectChanges();

    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.getAttribute('aria-label')).toBe('Gunakan tema terang');
    expect(localStorage.getItem('sdi-theme')).toBe('dark');
  });
});
