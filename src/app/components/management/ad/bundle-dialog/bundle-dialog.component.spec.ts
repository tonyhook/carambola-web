import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { routes } from '../../../../app.routes';
import { BundleDialogComponent } from './bundle-dialog.component';

describe('BundleDialogComponent', () => {
  let component: BundleDialogComponent;
  let fixture: ComponentFixture<BundleDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ BundleDialogComponent ],
      providers: [
        provideHttpClient(),
        provideRouter(routes),
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: MatDialogRef, useValue: {} },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(BundleDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
