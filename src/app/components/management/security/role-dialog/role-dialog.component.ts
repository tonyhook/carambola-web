import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { Role } from '../../../../core';
import { RoleFormComponent } from '../role-form/role-form.component';

@Component({
  selector: 'carambola-role-dialog',
  imports: [
    RoleFormComponent
  ],
  templateUrl: './role-dialog.component.html',
  styleUrls: ['./role-dialog.component.scss'],
})
export class RoleDialogComponent {
  role: Role | null = null;

  constructor(
    private dialogRef: MatDialogRef<RoleDialogComponent>,
    @Inject(MAT_DIALOG_DATA) data: Role,
  ) {
    if (data) {
      this.role = data;
    } else {
      this.role = null;
    }
  }

  changed(changed: boolean) {
    this.dialogRef.close(changed);
  }

}
