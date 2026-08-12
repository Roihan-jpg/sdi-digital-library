import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create the application shell', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.nativeElement.querySelector('router-outlet')).toBeTruthy();
  });

  it('applies the unified theme class on the application host', () => {
    localStorage.setItem('sdi-theme', 'dark');
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).classList.contains('app-theme--dark')).toBe(true);
  });
});
