import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { AntiFraudDialogComponent } from './anti-fraud-dialog.component';

describe('AntiFraudDialogComponent', () => {
  let component: AntiFraudDialogComponent;
  let fixture: ComponentFixture<AntiFraudDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ AntiFraudDialogComponent ],
      providers: [
        provideHttpClient(),
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: MatDialogRef, useValue: {} },
      ],

    })
    .compileComponents();

    fixture = TestBed.createComponent(AntiFraudDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
