import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { ClientChannel } from '../..';
import { ClientChannelFormComponent } from '../client-channel-form/client-channel-form.component';

@Component({
  selector: 'carambola-perf-client-channel-dialog',
  imports: [ClientChannelFormComponent],
  templateUrl: './client-channel-dialog.component.html',
  styleUrls: ['./client-channel-dialog.component.scss'],
})
export class ClientChannelDialogComponent {
  private dialogRef = inject<MatDialogRef<ClientChannelDialogComponent>>(MatDialogRef);
  clientChannel: ClientChannel | null = inject<ClientChannel | null>(MAT_DIALOG_DATA);

  changed(changed: boolean) {
    this.dialogRef.close(changed);
  }
}
