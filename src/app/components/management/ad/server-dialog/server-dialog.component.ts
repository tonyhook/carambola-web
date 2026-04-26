import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { Server } from '../../../../core';
import { ServerFormComponent } from '../server-form/server-form.component';

@Component({
  selector: 'carambola-server-dialog',
  imports: [
    ServerFormComponent,
  ],
  templateUrl: './server-dialog.component.html',
  styleUrls: ['./server-dialog.component.scss'],
})
export class ServerDialogComponent {
  private dialogRef = inject<MatDialogRef<ServerDialogComponent>>(MatDialogRef);

  server: Server | null;

  constructor() {
    const data = inject<Server>(MAT_DIALOG_DATA);

    this.server = data;
  }

  changed(changed: boolean) {
    this.dialogRef.close(changed);
  }

}
