import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { PartnerType, VendorMedia } from '../../../../core';
import { VendorMediaFormComponent } from '../vendormedia-form/vendormedia-form.component';

export interface VendorMediaDialogData {
  mode: PartnerType;
  vendorId: number;
  vendorMedia: VendorMedia | null;
}

@Component({
  selector: 'carambola-vendormedia-dialog',
  imports: [
    VendorMediaFormComponent,
  ],
  templateUrl: './vendormedia-dialog.component.html',
  styleUrls: ['./vendormedia-dialog.component.scss'],
})
export class VendorMediaDialogComponent {
  mode: PartnerType;
  vendorMedia: VendorMedia | null;
  vendorId: number;

  constructor(
    private dialogRef: MatDialogRef<VendorMediaDialogComponent>,
    @Inject(MAT_DIALOG_DATA) data: VendorMediaDialogData,
  ) {
    this.mode = data.mode;
    this.vendorId = data.vendorId;
    this.vendorMedia = data.vendorMedia;
 }

  changed(changed: boolean) {
    this.dialogRef.close(changed);
  }

}
