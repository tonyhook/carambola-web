import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { ServerFormComponent } from '../server-form/server-form.component';
import { Server } from '../../../../core';

@Component({
  selector: 'carambola-server-dialog',
  imports: [
    ServerFormComponent,
  ],
  templateUrl: './server-dialog.component.html',
  styleUrls: ['./server-dialog.component.scss'],
})
export class ServerDialogComponent {
  server: Server | null;

  constructor(
    private dialogRef: MatDialogRef<ServerDialogComponent>,
    @Inject(MAT_DIALOG_DATA) data: Server,
  ) {
    this.server = data;
  }

  changed(changed: boolean) {
    this.dialogRef.close(changed);
  }

}
