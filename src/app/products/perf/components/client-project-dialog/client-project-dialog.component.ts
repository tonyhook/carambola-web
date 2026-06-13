import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { ClientProject } from '../..';
import { ClientProjectFormComponent } from '../client-project-form/client-project-form.component';

@Component({
  selector: 'carambola-perf-client-project-dialog',
  imports: [ClientProjectFormComponent],
  templateUrl: './client-project-dialog.component.html',
  styleUrls: ['./client-project-dialog.component.scss'],
})
export class ClientProjectDialogComponent {
  private dialogRef = inject<MatDialogRef<ClientProjectDialogComponent>>(MatDialogRef);
  clientProject: ClientProject | null = inject<ClientProject | null>(MAT_DIALOG_DATA);
  changed(changed: boolean) { this.dialogRef.close(changed); }
}
