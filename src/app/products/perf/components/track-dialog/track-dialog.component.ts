import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { Track } from '../..';
import { TrackFormComponent } from '../track-form/track-form.component';

@Component({
  selector: 'carambola-perf-track-dialog',
  imports: [TrackFormComponent],
  templateUrl: './track-dialog.component.html',
  styleUrls: ['./track-dialog.component.scss'],
})
export class TrackDialogComponent {
  private dialogRef = inject<MatDialogRef<TrackDialogComponent>>(MatDialogRef);
  track: Track | null = inject<Track | null>(MAT_DIALOG_DATA);

  changed(changed: boolean) {
    this.dialogRef.close(changed);
  }
}
