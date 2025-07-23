import { Component, inject } from '@angular/core';
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
  private dialogRef = inject<MatDialogRef<AuthorityDialogComponent>>(MatDialogRef);
  public authority: Authority | null = inject(MAT_DIALOG_DATA, {optional: true}) as Authority | null;

  changed(changed: boolean) {
    this.dialogRef.close(changed);
  }

}
