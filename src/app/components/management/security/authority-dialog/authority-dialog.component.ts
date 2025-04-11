import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { Authority } from '../../../../core';
import { AuthorityFormComponent } from '../authority-form/authority-form.component';

@Component({
  selector: 'carambola-authority-dialog',
  imports: [
    AuthorityFormComponent
  ],
  templateUrl: './authority-dialog.component.html',
  styleUrls: ['./authority-dialog.component.scss'],
})
export class AuthorityDialogComponent {
  authority: Authority | null;

  constructor(
    private dialogRef: MatDialogRef<AuthorityDialogComponent>,
    @Inject(MAT_DIALOG_DATA) data: Authority,
  ) {
    if (data) {
      this.authority = data;
    } else {
      this.authority = null;
    }
  }

  changed(changed: boolean) {
    this.dialogRef.close(changed);
  }

}
