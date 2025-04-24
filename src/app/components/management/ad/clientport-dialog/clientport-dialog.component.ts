import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { ClientPort, PartnerType } from '../../../../core';
import { ClientPortFormComponent } from '../clientport-form/clientport-form.component';

export interface ClientPortDialogData {
  mode: PartnerType;
  tab: string;
  clientMediaId: number;
  clientPort: ClientPort | null;
};

@Component({
  selector: 'carambola-clientport-dialog',
  imports: [
    ClientPortFormComponent,
  ],
  templateUrl: './clientport-dialog.component.html',
  styleUrls: ['./clientport-dialog.component.scss'],
})
export class ClientPortDialogComponent {
  mode: PartnerType;
  tab: string;
  clientPort: ClientPort | null;
  clientMediaId: number;

  constructor(
    private dialogRef: MatDialogRef<ClientPortDialogComponent>,
    @Inject(MAT_DIALOG_DATA) data: ClientPortDialogData,
  ) {
    this.mode = data.mode;
    this.tab = data.tab;
    this.clientMediaId = data.clientMediaId;
    this.clientPort = data.clientPort;
  }

  changed(changed: boolean) {
    this.dialogRef.close(changed);
  }

}
