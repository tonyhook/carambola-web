import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { ServerDialogComponent } from './server-dialog.component';

describe('ServerDialogComponent', () => {
  let component: ServerDialogComponent;
  let fixture: ComponentFixture<ServerDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ ServerDialogComponent ],
      providers: [
        provideHttpClient(),
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: MatDialogRef, useValue: {} },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ServerDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
