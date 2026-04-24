import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { VendorPortDialogComponent } from './vendorport-dialog.component';

describe('VendorPortDialogComponent', () => {
  let component: VendorPortDialogComponent;
  let fixture: ComponentFixture<VendorPortDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ VendorPortDialogComponent ],
      providers: [
        provideHttpClientTesting(),
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: MatDialogRef, useValue: {} },
       ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(VendorPortDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
