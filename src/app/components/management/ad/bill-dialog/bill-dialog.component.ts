import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { Bill, BillStatus, Client, ClientPort } from '../../../../core';
import { AdEntityComponent } from '../../../../shared/components/ad-entity/ad-entity.component';

export interface BillDialogData {
  client: Client;
  clientPort: ClientPort;
  date: Date;
  bill: Bill | null;
}

@Component({
  selector: 'carambola-bill-dialog',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    AdEntityComponent
  ],
  templateUrl: './bill-dialog.component.html',
  styleUrls: ['./bill-dialog.component.scss'],
})
export class BillDialogComponent {
  client: Client;
  clientPort: ClientPort;
  date: Date;
  bill: Bill | null;

  formGroup: UntypedFormGroup;

  constructor(
    private formBuilder: UntypedFormBuilder,
    public dialogRef: MatDialogRef<BillDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: BillDialogData,
  ) {
    this.client = data.client;
    this.clientPort = data.clientPort;
    this.date = data.date;
    this.bill = data.bill;

    this.formGroup = this.formBuilder.group({
      'request': [this.bill ? this.bill.request : '', [Validators.pattern('^[0-9]*$'), Validators.min(0)]],
      'response': [this.bill ? this.bill.response : '', [Validators.pattern('^[0-9]*$'), Validators.min(0)]],
      'impression': [this.bill ? this.bill.impression : '', [Validators.required, Validators.pattern('^[0-9]*$'), Validators.min(0)]],
      'click': [this.bill ? this.bill.click : '', [Validators.required, Validators.pattern('^[0-9]*$'), Validators.min(0)]],
      'cost': [this.bill ? (this.bill.cost ?? 0) / 100000 : '', [Validators.required, Validators.pattern('^[0-9]*[\\.]?[0-9]*$'), Validators.min(0)]],
    });
  }

  toISOStringWithTimezone(date: Date) {
    const tzo = date.getTimezoneOffset();
    const dif = tzo < 0 ? '+' : '-';
    const pad = function(num: number) {
      return (num < 10 ? '0' : '') + num;
    }

    return date.getFullYear() +
        '-' + pad(date.getMonth() + 1) +
        '-' + pad(date.getDate()) +
        'T' + pad(date.getHours()) +
        ':' + pad(date.getMinutes()) +
        ':' + pad(date.getSeconds()) +
        dif + pad(Math.floor(Math.abs(tzo) / 60)) +
        ':' + pad(Math.abs(tzo) % 60);
  }

  cancel() {
    this.dialogRef.close();
  }

  confirm() {
    if (!this.formGroup.valid) {
      this.formGroup.markAllAsTouched();
      return;
    }

    const bill: Bill = {
      date: this.toISOStringWithTimezone(this.date),
      tagId: this.clientPort.tagId.split('|')[0],
      clientPort: this.clientPort.id!,
      request: this.formGroup.value.request,
      response: this.formGroup.value.response,
      impression: this.formGroup.value.impression,
      click: this.formGroup.value.click,
      cost: Math.round(this.formGroup.value.cost * 100000),
      status: BillStatus.BILL_STATUS_MANUAL,
    }

    this.dialogRef.close(bill);
  }

}
