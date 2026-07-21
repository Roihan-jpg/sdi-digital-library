import { TestBed } from '@angular/core/testing';
import { NotificationService } from '../../../core/notifications/notification.service';
import { NotificationBanner } from './notification-banner';

describe('NotificationBanner', () => {
  it('renders and dismisses an error notification', async () => {
    await TestBed.configureTestingModule({ imports: [NotificationBanner] }).compileComponents();
    const notifications = TestBed.inject(NotificationService);
    const fixture = TestBed.createComponent(NotificationBanner);

    notifications.showError('Data tidak dapat dimuat.', 'req-123');
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'Data tidak dapat dimuat.',
    );
    expect(element.querySelector('code')?.textContent).toContain('req-123');

    (element.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(element.querySelector('[role="alert"]')).toBeNull();
  });
});
