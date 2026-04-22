import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { ClientMedia, PartnerType } from '../../../../core';
import { ClientMediaFormComponent } from '../clientmedia-form/clientmedia-form.component';

export interface ClientMediaDialogData {
  mode: PartnerType;
  clientId: number;
  clientMedia: ClientMedia | null;
}

@Component({
  selector: 'carambola-clientmedia-dialog',
  imports: [
    ClientMediaFormComponent,
  ],
  templateUrl: './clientmedia-dialog.component.html',
  styleUrls: ['./clientmedia-dialog.component.scss'],
})
export class ClientMediaDialogComponent {
  private dialogRef = inject<MatDialogRef<ClientMediaDialogComponent>>(MatDialogRef);

  mode: PartnerType;
  clientMedia: ClientMedia | null;
  clientId: number;

  constructor() {
    const data = inject<ClientMediaDialogData>(MAT_DIALOG_DATA);

    this.mode = data.mode;
    this.clientId = data.clientId;
    this.clientMedia = data.clientMedia;
 }

  changed(changed: boolean) {
    this.dialogRef.close(changed);
  }

}
