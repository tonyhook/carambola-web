import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { AuthorityDialogComponent } from './authority-dialog.component';

describe('AuthorityDialogComponent', () => {
  let component: AuthorityDialogComponent;
  let fixture: ComponentFixture<AuthorityDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ AuthorityDialogComponent ],
      providers: [
        provideHttpClientTesting(),
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: MatDialogRef, useValue: {} },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(AuthorityDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
