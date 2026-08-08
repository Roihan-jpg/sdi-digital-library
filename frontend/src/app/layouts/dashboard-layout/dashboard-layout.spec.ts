import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../core/auth/auth.service';
import { DashboardLayout } from './dashboard-layout';

describe('DashboardLayout', () => {
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
});
