import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { Tenant } from '../../../../core';
import { TenantFormComponent } from '../tenant-form/tenant-form.component';

@Component({
  selector: 'carambola-tenant-dialog',
  imports: [
    TenantFormComponent
  ],
  templateUrl: './tenant-dialog.component.html',
  styleUrls: ['./tenant-dialog.component.scss'],
})
export class TenantDialogComponent {
  private dialogRef = inject<MatDialogRef<TenantDialogComponent>>(MatDialogRef);

  tenant: Tenant | null;

  constructor() {
    const data = inject<Tenant>(MAT_DIALOG_DATA);

    if (data) {
      this.tenant = data;
    } else {
      this.tenant = null;
    }
  }

  changed(changed: boolean) {
    this.dialogRef.close(changed);
  }

}
