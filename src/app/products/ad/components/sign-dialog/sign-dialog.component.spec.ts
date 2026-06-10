import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { SignDialogComponent } from './sign-dialog.component';

describe('SignDialogComponent', () => {
  let component: SignDialogComponent;
  let fixture: ComponentFixture<SignDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ SignDialogComponent ],
      providers: [
        provideHttpClient(),
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: MatDialogRef, useValue: {} },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(SignDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
