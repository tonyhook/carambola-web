import { Component, Inject } from '@angular/core';
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
  mode: PartnerType;
  vendor: Vendor | null;

  constructor(
    private dialogRef: MatDialogRef<VendorDialogComponent>,
    @Inject(MAT_DIALOG_DATA) data: VendorDialogData,
  ) {
    this.vendor = data.vendor;
    this.mode = data.mode;
  }

  changed(changed: boolean) {
    this.dialogRef.close(changed);
  }

}
