import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { TrafficControl, TrafficControlIndicator, TrafficControlPeriod } from '../../../core';

@Component({
  selector: 'carambola-traffic-control-dialog',
  imports: [
    MatButtonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './traffic-control-dialog.component.html',
  styleUrls: ['./traffic-control-dialog.component.scss'],
})
export class TrafficControlDialogComponent {
  private formBuilder = inject(UntypedFormBuilder);
  dialogRef = inject<MatDialogRef<TrafficControlDialogComponent>>(MatDialogRef);
  data = inject<TrafficControl>(MAT_DIALOG_DATA);

  TrafficControlIndicator = TrafficControlIndicator;
  TrafficControlPeriod = TrafficControlPeriod;

  trafficControl: TrafficControl;

  formGroup: UntypedFormGroup;

  constructor() {
    const data = this.data;

    this.formGroup = this.formBuilder.group({
      'indicator': [null, Validators.required],
      'period': [null, Validators.required],
      'limitation': [null, [Validators.pattern('^[0-9]*$'), Validators.min(0)]],
    });

    this.trafficControl = data;

    this.formGroup.setControl('indicator', this.formBuilder.control(this.trafficControl.indicator, Validators.required), {emitEvent: false});
    this.formGroup.setControl('period', this.formBuilder.control(this.trafficControl.period, Validators.required), {emitEvent: false});
    this.formGroup.setControl('limitation', this.formBuilder.control(this.trafficControl.limitation, [Validators.pattern('^[0-9]*$'), Validators.min(0)]), {emitEvent: false});
  }

  cancel() {
    this.dialogRef.close();
  }

  confirm() {
    if (!this.formGroup.valid) {
      this.formGroup.markAllAsTouched();
      return;
    }

    this.trafficControl.indicator = this.formGroup.value.indicator;
    this.trafficControl.period = this.formGroup.value.period;
    this.trafficControl.limitation = this.formGroup.value.limitation;

    if (this.trafficControl.indicator === TrafficControlIndicator.TC_INDICATOR_COST) {
      this.trafficControl.limitation *= 100000;
    }

    this.dialogRef.close(this.trafficControl);
  }

}
