import { Component, OnInit, inject } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { AntiFraud, AntiFraudPeriod, AntiFraudRule, AntiFraudRuleAPI } from '../../../core';

@Component({
  selector: 'carambola-anti-fraud-dialog',
  imports: [
    MatButtonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './anti-fraud-dialog.component.html',
  styleUrls: ['./anti-fraud-dialog.component.scss'],
})
export class AntiFraudDialogComponent implements OnInit {
  private formBuilder = inject(UntypedFormBuilder);
  private antiFraudRuleAPI = inject(AntiFraudRuleAPI);
  dialogRef = inject<MatDialogRef<AntiFraudDialogComponent>>(MatDialogRef);
  data = inject<AntiFraud>(MAT_DIALOG_DATA);

  AntiFraudPeriod = AntiFraudPeriod;

  antiFraud: AntiFraud;
  antiFraudRules: AntiFraudRule[] = [];

  formGroup: UntypedFormGroup;

  constructor() {
    const data = this.data;

    this.formGroup = this.formBuilder.group({
      'rule': [null, Validators.required],
      'period': [null, Validators.required],
      'limitation': [null, [Validators.pattern('^[0-9]*[\\.]?[0-9]*$'), Validators.min(0)]],
    });

    this.antiFraud = data;

    this.formGroup.setControl('rule', this.formBuilder.control(this.antiFraud.rule, Validators.required), {emitEvent: false});
    this.formGroup.setControl('period', this.formBuilder.control(this.antiFraud.period, Validators.required), {emitEvent: false});
    this.formGroup.setControl('limitation', this.formBuilder.control(this.antiFraud.limitation, [Validators.pattern('^[0-9]*[\\.]?[0-9]*$'), Validators.min(0)]), {emitEvent: false});
  }

  ngOnInit() {
    this.antiFraudRuleAPI.getAntiFraudRuleList().subscribe(antiFraudRules => {
      this.antiFraudRules = antiFraudRules.filter(antiFraudRule => antiFraudRule.enabled);
    });
  }

  cancel() {
    this.dialogRef.close();
  }

  confirm() {
    if (!this.formGroup.valid) {
      this.formGroup.markAllAsTouched();
      return;
    }

    this.antiFraud.rule = this.formGroup.value.rule;
    this.antiFraud.period = this.formGroup.value.period;
    this.antiFraud.limitation = this.formGroup.value.limitation;

    this.dialogRef.close(this.antiFraud);
  }

}
