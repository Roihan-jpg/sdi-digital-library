import { TestBed } from '@angular/core/testing';
import { FeedbackBanner } from './feedback-banner';

describe('FeedbackBanner', () => {
  it('renders error feedback as an atomic alert with a request reference', async () => {
    await TestBed.configureTestingModule({ imports: [FeedbackBanner] }).compileComponents();
    const fixture = TestBed.createComponent(FeedbackBanner);
    fixture.componentRef.setInput('tone', 'error');
    fixture.componentRef.setInput('message', 'Data tidak dapat disimpan.');
    fixture.componentRef.setInput('requestId', 'request-123');
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const banner = element.querySelector('[role="alert"]');
    expect(banner?.getAttribute('aria-atomic')).toBe('true');
    expect(banner?.classList.contains('alert--error')).toBe(true);
    expect(element.querySelector('code')?.textContent).toContain('request-123');
  });

  it('uses polite status semantics and emits dismiss only when dismissible', async () => {
    await TestBed.configureTestingModule({ imports: [FeedbackBanner] }).compileComponents();
    const fixture = TestBed.createComponent(FeedbackBanner);
    const dismissed = vi.fn();
    fixture.componentRef.setInput('tone', 'success');
    fixture.componentRef.setInput('message', 'Data berhasil disimpan.');
    fixture.componentRef.setInput('dismissible', true);
    fixture.componentInstance.dismissed.subscribe(dismissed);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('[role="status"]')?.classList.contains('alert--success')).toBe(
      true,
    );
    (element.querySelector('button') as HTMLButtonElement).click();
    expect(dismissed).toHaveBeenCalledOnce();
  });
});
