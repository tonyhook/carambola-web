import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { User } from '../../../../core';
import { UserFormComponent } from '../user-form/user-form.component';

@Component({
  selector: 'carambola-user-dialog',
  imports: [
    UserFormComponent
  ],
  templateUrl: './user-dialog.component.html',
  styleUrls: ['./user-dialog.component.scss'],
})
export class UserDialogComponent {
  user: User | null = null;

  constructor(
    private dialogRef: MatDialogRef<UserDialogComponent>,
    @Inject(MAT_DIALOG_DATA) data: User,
  ) {
    if (data) {
      this.user = data;
    } else {
      this.user = null;
    }
  }

  changed(changed: boolean) {
    this.dialogRef.close(changed);
  }

}
