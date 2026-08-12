import { Component } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../core/auth/auth.service';
import { AuthStore } from '../../core/auth/auth.store';
import { PublicLayout } from './public-layout';
import { axeViolations } from '../../../testing/axe-testing';

@Component({ template: '' })
class EmptyRoutePage {}

describe('PublicLayout', () => {
  beforeEach(() => localStorage.setItem('sdi-theme', 'light'));
  afterEach(() => localStorage.clear());

  it('toggles the mobile navigation with an accessible expanded state', async () => {
    await TestBed.configureTestingModule({
      imports: [PublicLayout],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(PublicLayout);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const trigger = element.querySelector('.menu-button') as HTMLButtonElement;
    expect(trigger.getAttribute('aria-expanded')).toBe('false');

    trigger.click();
    fixture.detectChanges();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(element.querySelector('.links')?.classList.contains('links--open')).toBe(true);
  });

  it('exposes the shared theme toggle in the public header', async () => {
    await TestBed.configureTestingModule({
      imports: [PublicLayout],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(PublicLayout);
    fixture.detectChanges();

    const toggle = fixture.nativeElement.querySelector(
      'sdi-theme-toggle button',
    ) as HTMLButtonElement;
    toggle.click();
    fixture.detectChanges();

    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(localStorage.getItem('sdi-theme')).toBe('dark');
  });

  it('marks the active route and renders the role-aware account destination', async () => {
    await TestBed.configureTestingModule({
      imports: [PublicLayout],
      providers: [
        provideRouter([{ path: '', component: EmptyRoutePage }]),
        {
          provide: AuthStore,
          useValue: { isAuthenticated: () => true, currentRole: () => 'librarian' },
        },
        { provide: AuthService, useValue: { logout: vi.fn(() => Promise.resolve()) } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(PublicLayout);
    await TestBed.inject(Router).navigateByUrl('/');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const homeLink = fixture.nativeElement.querySelector('.links > a') as HTMLAnchorElement;
    const accountLink = fixture.nativeElement.querySelector('.header-actions .account-link');
    expect(homeLink.classList.contains('is-active')).toBe(true);
    expect(accountLink?.textContent).toContain('Dashboard');
    expect(accountLink?.getAttribute('href')).toBe('/dashboard/operasional');
  });

  it('closes the mobile navigation with Escape and returns focus to its trigger', async () => {
    await TestBed.configureTestingModule({
      imports: [PublicLayout],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(PublicLayout);
    fixture.detectChanges();

    const trigger = fixture.nativeElement.querySelector('.menu-button') as HTMLButtonElement;
    trigger.click();
    fixture.detectChanges();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    await Promise.resolve();

    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
  });

  it('does not steal focus when Escape is pressed while the drawer is closed', async () => {
    await TestBed.configureTestingModule({
      imports: [PublicLayout],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(PublicLayout);
    fixture.detectChanges();
    const accountLink = fixture.nativeElement.querySelector('.account-link') as HTMLAnchorElement;
    accountLink.focus();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await Promise.resolve();

    expect(document.activeElement).toBe(accountLink);
  });

  it('passes the automated WCAG audit with the drawer open', async () => {
    await TestBed.configureTestingModule({
      imports: [PublicLayout],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(PublicLayout);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.menu-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(await axeViolations(fixture.nativeElement)).toEqual([]);
  }, 15_000);
});
