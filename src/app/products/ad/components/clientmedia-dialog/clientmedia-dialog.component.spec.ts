import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { ClientMediaDialogComponent } from './clientmedia-dialog.component';

describe('ClientMediaDialogComponent', () => {
  let component: ClientMediaDialogComponent;
  let fixture: ComponentFixture<ClientMediaDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ ClientMediaDialogComponent ],
      providers: [
        provideHttpClient(),
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: MatDialogRef, useValue: {} },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClientMediaDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
