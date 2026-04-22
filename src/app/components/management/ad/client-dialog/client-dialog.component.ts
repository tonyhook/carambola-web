import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { Client, PartnerType } from '../../../../core';
import { ClientFormComponent } from '../client-form/client-form.component';

export interface ClientDialogData {
  mode: PartnerType;
  client: Client | null;
}

@Component({
  selector: 'carambola-client-dialog',
  imports: [
    ClientFormComponent,
  ],
  templateUrl: './client-dialog.component.html',
  styleUrls: ['./client-dialog.component.scss'],
})
export class ClientDialogComponent {
  private dialogRef = inject<MatDialogRef<ClientDialogComponent>>(MatDialogRef);

  mode: PartnerType;
  client: Client | null;

  constructor() {
    const data = inject<ClientDialogData>(MAT_DIALOG_DATA);

    this.client = data.client;
    this.mode = data.mode;
  }

  changed(changed: boolean) {
    this.dialogRef.close(changed);
  }

}
