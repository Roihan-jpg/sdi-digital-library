import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EmptyState } from './empty-state';

@Component({
  imports: [EmptyState],
  template: `
    <sdi-empty-state title="Belum ada buku" description="Scan buku untuk memulai.">
      <button type="button">Scan buku</button>
    </sdi-empty-state>
  `,
})
class TestHost {}

describe('EmptyState', () => {
  it('renders its guidance and projected action', async () => {
    await TestBed.configureTestingModule({ imports: [TestHost] }).compileComponents();
    const fixture = TestBed.createComponent(TestHost);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('h2')?.textContent).toContain('Belum ada buku');
    expect(element.querySelector('p')?.textContent).toContain('Scan buku untuk memulai.');
    expect(element.querySelector('button')?.textContent).toContain('Scan buku');
    expect(element.querySelector('[id="empty-title"]')).toBeNull();
  });
});
