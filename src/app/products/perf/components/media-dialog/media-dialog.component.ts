import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { Media } from '../..';
import { MediaFormComponent } from '../media-form/media-form.component';

@Component({
  selector: 'carambola-perf-media-dialog',
  imports: [MediaFormComponent],
  templateUrl: './media-dialog.component.html',
  styleUrls: ['./media-dialog.component.scss'],
})
export class MediaDialogComponent {
  private dialogRef = inject<MatDialogRef<MediaDialogComponent>>(MatDialogRef);
  media: Media | null = inject<Media | null>(MAT_DIALOG_DATA);

  changed(changed: boolean) {
    this.dialogRef.close(changed);
  }
}
