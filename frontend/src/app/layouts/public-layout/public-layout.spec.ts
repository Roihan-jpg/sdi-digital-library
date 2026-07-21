import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { PublicLayout } from './public-layout';

describe('PublicLayout', () => {
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
});
