import { Component, Inject } from '@angular/core';
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
  mode: PartnerType;
  clientMedia: ClientMedia | null;
  clientId: number;

  constructor(
    private dialogRef: MatDialogRef<ClientMediaDialogComponent>,
    @Inject(MAT_DIALOG_DATA) data: ClientMediaDialogData,
  ) {
    this.mode = data.mode;
    this.clientId = data.clientId;
    this.clientMedia = data.clientMedia;
 }

  changed(changed: boolean) {
    this.dialogRef.close(changed);
  }

}
