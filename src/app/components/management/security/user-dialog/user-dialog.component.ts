import { Component, inject } from '@angular/core';
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
  private dialogRef = inject<MatDialogRef<UserDialogComponent>>(MatDialogRef);
  public user: User | null = inject(MAT_DIALOG_DATA, { optional: true }) as User | null;

  changed(changed: boolean) {
    this.dialogRef.close(changed);
  }

}
