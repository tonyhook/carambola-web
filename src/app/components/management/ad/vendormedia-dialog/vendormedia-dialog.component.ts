import { Component, inject } from '@angular/core';
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
  private dialogRef = inject<MatDialogRef<VendorMediaDialogComponent>>(MatDialogRef);

  mode: PartnerType;
  vendorMedia: VendorMedia | null;
  vendorId: number;

  constructor() {
    const data = inject<VendorMediaDialogData>(MAT_DIALOG_DATA);

    this.mode = data.mode;
    this.vendorId = data.vendorId;
    this.vendorMedia = data.vendorMedia;
 }

  changed(changed: boolean) {
    this.dialogRef.close(changed);
  }

}
