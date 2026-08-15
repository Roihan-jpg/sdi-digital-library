import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { CirculationApiService } from '../../data-access/circulation-api.service';
import { OperationsPage } from './operations-page';

describe('OperationsPage scanner flow', () => {
  const member = {
    id: 'member-1',
    member_code: 'MEM-001',
    card_number: 'CARD-001',
    full_name: 'Member Demo',
    is_active: true,
    class_name: '4A',
    active_loan_count: 0,
    outstanding_fine: 0,
  };

  it('moves focus from a successful member scan to the book scanner', async () => {
    await TestBed.configureTestingModule({
      imports: [OperationsPage],
      providers: [
        provideRouter([]),
        {
          provide: CirculationApiService,
          useValue: { lookupMember: () => of({ data: member }) },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(OperationsPage);
    fixture.detectChanges();
    const memberInput = fixture.nativeElement.querySelector('#member-scan') as HTMLInputElement;
    const component = fixture.componentInstance as unknown as {
      memberCode: { setValue(value: string): void };
      scanMember(): void;
    };
    component.memberCode.setValue('CARD-001');
    component.scanMember();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(document.activeElement).toBe(
      fixture.nativeElement.querySelector('#book-scan') as HTMLInputElement,
    );
  });

  it('keeps the scan value and restores focus after a lookup error', async () => {
    await TestBed.configureTestingModule({
      imports: [OperationsPage],
      providers: [
        provideRouter([]),
        {
          provide: CirculationApiService,
          useValue: { lookupMember: () => throwError(() => new Error('offline')) },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(OperationsPage);
    fixture.detectChanges();
    const memberInput = fixture.nativeElement.querySelector('#member-scan') as HTMLInputElement;
    const component = fixture.componentInstance as unknown as {
      memberCode: { setValue(value: string): void };
      scanMember(): void;
    };
    component.memberCode.setValue('CARD-RETRY');
    component.scanMember();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(memberInput.value).toBe('CARD-RETRY');
    expect(document.activeElement).toBe(memberInput);
    expect(fixture.nativeElement.textContent).toContain('Input tetap tersimpan');
    expect(fixture.nativeElement.querySelector('.feedback-banner')?.getAttribute('role')).toBe(
      'alert',
    );
  });

  it('announces an inactive member as a warning instead of neutral status', async () => {
    await TestBed.configureTestingModule({
      imports: [OperationsPage],
      providers: [
        provideRouter([]),
        {
          provide: CirculationApiService,
          useValue: { lookupMember: () => of({ data: { ...member, is_active: false } }) },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(OperationsPage);
    fixture.detectChanges();
    const component = fixture.componentInstance as unknown as {
      memberCode: { setValue(value: string): void };
      scanMember(): void;
    };
    component.memberCode.setValue('CARD-INACTIVE');
    component.scanMember();
    fixture.detectChanges();

    const banner = fixture.nativeElement.querySelector('.feedback-banner') as HTMLElement;
    expect(banner.textContent).toContain('Member tidak aktif');
    expect(banner.classList).toContain('alert--warning');
    expect(banner.getAttribute('role')).toBe('status');
  });
});
