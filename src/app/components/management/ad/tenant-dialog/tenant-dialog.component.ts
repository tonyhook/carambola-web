import { Component, Inject } from '@angular/core';
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
  tenant: Tenant | null;

  constructor(
    private dialogRef: MatDialogRef<TenantDialogComponent>,
    @Inject(MAT_DIALOG_DATA) data: Tenant,
  ) {
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
