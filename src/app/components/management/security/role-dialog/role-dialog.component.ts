import { Component, inject } from '@angular/core';
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
  private dialogRef = inject<MatDialogRef<RoleDialogComponent>>(MatDialogRef);
  public role: Role | null = inject(MAT_DIALOG_DATA, { optional: true }) as Role | null;

  changed(changed: boolean) {
    this.dialogRef.close(changed);
  }

}
