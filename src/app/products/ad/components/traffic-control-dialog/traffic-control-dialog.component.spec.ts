import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { TrafficControlDialogComponent } from './traffic-control-dialog.component';

describe('TrafficControlDialogComponent', () => {
  let component: TrafficControlDialogComponent;
  let fixture: ComponentFixture<TrafficControlDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ TrafficControlDialogComponent ],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: MatDialogRef, useValue: {} },
      ],

    })
    .compileComponents();

    fixture = TestBed.createComponent(TrafficControlDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
