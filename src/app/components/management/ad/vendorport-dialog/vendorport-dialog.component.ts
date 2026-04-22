import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { PartnerType, VendorPort } from '../../../../core';
import { VendorPortFormComponent } from '../vendorport-form/vendorport-form.component';

export interface VendorPortDialogData {
  mode: PartnerType;
  tab: string,
  vendorMediaId: number;
  vendorPort: VendorPort | null;
};

@Component({
  selector: 'carambola-vendorport-dialog',
  imports: [
    VendorPortFormComponent,
  ],
  templateUrl: './vendorport-dialog.component.html',
  styleUrls: ['./vendorport-dialog.component.scss'],
})
export class VendorPortDialogComponent {
  private dialogRef = inject<MatDialogRef<VendorPortDialogComponent>>(MatDialogRef);

  mode: PartnerType;
  tab: string;
  vendorPort: VendorPort | null;
  vendorMediaId: number;

  constructor() {
    const data = inject<VendorPortDialogData>(MAT_DIALOG_DATA);

    this.mode = data.mode;
    this.tab = data.tab;
    this.vendorMediaId = data.vendorMediaId;
    this.vendorPort = data.vendorPort;
  }

  changed(changed: boolean) {
    this.dialogRef.close(changed);
  }

}
