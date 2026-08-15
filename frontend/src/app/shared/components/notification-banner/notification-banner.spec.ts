import { TestBed } from '@angular/core/testing';
import { NavigationStart, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { NotificationService } from '../../../core/notifications/notification.service';
import { NotificationBanner } from './notification-banner';

describe('NotificationBanner', () => {
  it('renders and dismisses an error notification', async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationBanner],
      providers: [{ provide: Router, useValue: { events: new Subject() } }],
    }).compileComponents();
    const notifications = TestBed.inject(NotificationService);
    const fixture = TestBed.createComponent(NotificationBanner);

    notifications.showError('Data tidak dapat dimuat.', 'req-123');
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'Data tidak dapat dimuat.',
    );
    expect(element.querySelector('code')?.textContent).toContain('req-123');
    expect(element.querySelector('sdi-feedback-banner')).not.toBeNull();
    expect(element.textContent).toContain('Muat ulang');

    const closeButton = [...element.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Tutup'),
    );
    closeButton?.click();
    fixture.detectChanges();
    expect(element.querySelector('[role="alert"]')).toBeNull();
  });

  it('preserves a startup notification and clears it on later navigation', async () => {
    const events = new Subject<NavigationStart>();
    await TestBed.configureTestingModule({
      imports: [NotificationBanner],
      providers: [{ provide: Router, useValue: { events, navigated: false } }],
    }).compileComponents();
    const notifications = TestBed.inject(NotificationService);
    const fixture = TestBed.createComponent(NotificationBanner);
    notifications.showError('Error halaman lama.');
    fixture.detectChanges();

    events.next(new NavigationStart(1, '/awal'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();

    events.next(new NavigationStart(2, '/halaman-baru'));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
  });
});
