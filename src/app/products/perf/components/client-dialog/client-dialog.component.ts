import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { Client } from '../..';
import { ClientFormComponent } from '../client-form/client-form.component';

@Component({
  selector: 'carambola-perf-client-dialog',
  imports: [ClientFormComponent],
  templateUrl: './client-dialog.component.html',
  styleUrls: ['./client-dialog.component.scss'],
})
export class ClientDialogComponent {
  private dialogRef = inject<MatDialogRef<ClientDialogComponent>>(MatDialogRef);
  client: Client | null = inject<Client | null>(MAT_DIALOG_DATA);

  changed(changed: boolean) {
    this.dialogRef.close(changed);
  }
}
