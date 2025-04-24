import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { VendorMediaDialogComponent } from './vendormedia-dialog.component';

describe('VendorMediaDialogComponent', () => {
  let component: VendorMediaDialogComponent;
  let fixture: ComponentFixture<VendorMediaDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ VendorMediaDialogComponent ],
      providers: [
        provideHttpClient(),
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: MatDialogRef, useValue: {} },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(VendorMediaDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
