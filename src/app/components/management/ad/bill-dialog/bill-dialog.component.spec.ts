import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { BillDialogComponent } from './bill-dialog.component';

describe('BillDialogComponent', () => {
  let component: BillDialogComponent;
  let fixture: ComponentFixture<BillDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ BillDialogComponent ],
      providers: [
        provideHttpClient(),
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: MatDialogRef, useValue: {} },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(BillDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
