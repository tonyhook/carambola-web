import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { PartnerType, Vendor } from '../../../../core';
import { VendorFormComponent } from '../vendor-form/vendor-form.component';

export interface VendorDialogData {
  mode: PartnerType;
  vendor: Vendor | null;
}

@Component({
  selector: 'carambola-vendor-dialog',
  imports: [
    VendorFormComponent,
  ],
  templateUrl: './vendor-dialog.component.html',
  styleUrls: ['./vendor-dialog.component.scss'],
})
export class VendorDialogComponent {
  private dialogRef = inject<MatDialogRef<VendorDialogComponent>>(MatDialogRef);

  mode: PartnerType;
  vendor: Vendor | null;

  constructor() {
    const data = inject<VendorDialogData>(MAT_DIALOG_DATA);

    this.vendor = data.vendor;
    this.mode = data.mode;
  }

  changed(changed: boolean) {
    this.dialogRef.close(changed);
  }

}
