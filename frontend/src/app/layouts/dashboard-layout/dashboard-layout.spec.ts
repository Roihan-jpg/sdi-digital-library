import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../core/auth/auth.service';
import { DashboardLayout } from './dashboard-layout';

describe('DashboardLayout', () => {
  beforeEach(() => {
    localStorage.setItem('sdi-dashboard-theme', 'light');
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('collapses the desktop navigation rail with an accessible pressed state', async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardLayout],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { logout: () => Promise.resolve() } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(DashboardLayout);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const trigger = element.querySelector('.rail-toggle') as HTMLButtonElement;
    expect(trigger.getAttribute('aria-pressed')).toBe('false');

    trigger.click();
    fixture.detectChanges();
    expect(trigger.getAttribute('aria-pressed')).toBe('true');
    expect(element.querySelector('.shell')?.classList.contains('shell--compact')).toBe(true);
  });

  it('opens the mobile navigation and closes it with Escape', async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardLayout],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { logout: () => Promise.resolve() } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(DashboardLayout);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const trigger = element.querySelector('.menu-button') as HTMLButtonElement;
    const drawer = element.querySelector('aside') as HTMLElement;

    trigger.click();
    fixture.detectChanges();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(drawer.classList.contains('drawer--open')).toBe(true);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(drawer.classList.contains('drawer--open')).toBe(false);
  });

  it('toggles the dashboard theme on the layout host', async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardLayout],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { logout: () => Promise.resolve() } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(DashboardLayout);
    fixture.detectChanges();

    const trigger = fixture.nativeElement.querySelector(
      'sdi-theme-toggle button',
    ) as HTMLButtonElement;
    expect(trigger.getAttribute('aria-pressed')).toBe('false');

    trigger.click();
    fixture.detectChanges();

    expect(trigger.getAttribute('aria-pressed')).toBe('true');
    expect((fixture.nativeElement as HTMLElement).classList.contains('dashboard-theme--dark')).toBe(
      true,
    );
  });

  it('closes the profile disclosure with Escape and returns focus', async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardLayout],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { logout: () => Promise.resolve() } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(DashboardLayout);
    fixture.detectChanges();

    const trigger = fixture.nativeElement.querySelector('.profile-trigger') as HTMLButtonElement;
    trigger.click();
    fixture.detectChanges();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.querySelector('.profile-menu')).not.toBeNull();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    await Promise.resolve();

    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(fixture.nativeElement.querySelector('.profile-menu')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});
