import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { TenantDialogComponent } from './tenant-dialog.component';

describe('TenantDialogComponent', () => {
  let component: TenantDialogComponent;
  let fixture: ComponentFixture<TenantDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ TenantDialogComponent ],
      providers: [
        provideHttpClient(),
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: MatDialogRef, useValue: {} },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(TenantDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
