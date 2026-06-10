import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { ClientPortDialogComponent } from './clientport-dialog.component';

describe('ClientPortDialogComponent', () => {
  let component: ClientPortDialogComponent;
  let fixture: ComponentFixture<ClientPortDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ ClientPortDialogComponent ],
      providers: [
        provideHttpClient(),
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: MatDialogRef, useValue: {} },
       ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClientPortDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
