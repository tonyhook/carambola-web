import { Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';

import { Media, MediaAPI, TenantService } from '../..';

interface MediaFormControls {
  name: FormControl<string>;
  code: FormControl<string>;
  protocolKey: FormControl<string>;
  secretKey: FormControl<string>;
  remark: FormControl<string | null>;
}

@Component({
  selector: 'carambola-perf-media-form',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatTabsModule,
  ],
  templateUrl: './media-form.component.html',
  styleUrls: ['./media-form.component.scss'],
})
export class MediaFormComponent {
  private formBuilder = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private mediaAPI = inject(MediaAPI);
  tenantService = inject(TenantService);

  media = input<Media | null>(null);
  changed = output<boolean>();

  formGroup: FormGroup<MediaFormControls> = this.formBuilder.group({
    name: this.formBuilder.nonNullable.control('', Validators.required),
    code: this.formBuilder.nonNullable.control('', Validators.required),
    protocolKey: this.formBuilder.nonNullable.control('', Validators.required),
    secretKey: this.formBuilder.nonNullable.control(''),
    remark: this.formBuilder.control<string | null>(''),
  });

  constructor() {
    effect(() => {
      const media = this.media();
      if (!media) {
        return;
      }

      this.formGroup.patchValue({
        name: media.name ?? '',
        code: media.code ?? '',
        protocolKey: media.protocolKey?.join(',') ?? '',
        secretKey: media.secretKey?.join(',') ?? '',
        remark: media.remark ?? '',
      }, {emitEvent: false});

      if (!this.tenantService.isManager()) {
        this.formGroup.disable({emitEvent: false});
      }
    });
  }

  saveMedia() {
    if (!this.formGroup.valid) {
      this.formGroup.markAllAsTouched();
      return;
    }

    const current = this.media();
    const protocolKey = this.getProtocolKey();
    if (protocolKey.length === 0) {
      this.formGroup.controls.protocolKey.setErrors({required: true});
      this.formGroup.controls.protocolKey.markAsTouched();
      return;
    }

    const media: Media = {
      id: current?.id ?? null,
      deleted: current?.deleted ?? false,
      name: this.formGroup.controls.name.value,
      code: this.formGroup.controls.code.value,
      protocolKey,
      secretKey: this.splitKeys(this.formGroup.controls.secretKey.value),
      remark: this.formGroup.controls.remark.value,
      createTime: current?.createTime ?? null,
      updateTime: current?.updateTime ?? null,
    };
    const request = current?.id
      ? this.mediaAPI.updateMedia(current.id, media)
      : this.mediaAPI.addMedia(media);
    request.subscribe(() => {
      this.snackBar.open(current ? '媒体方已修改' : '媒体方已创建', 'OK', {
        duration: 2000,
      });
      this.changed.emit(true);
    });
  }

  removeMedia() {
    const media = this.media();
    if (!media?.id) {
      return;
    }

    this.mediaAPI.removeMedia(media.id).subscribe(() => {
      this.snackBar.open('媒体方已删除', 'OK', {
        duration: 2000,
      });
      this.changed.emit(true);
    });
  }

  cancelMedia() {
    this.changed.emit(false);
  }

  private getProtocolKey(): string[] {
    return this.splitKeys(this.formGroup.controls.protocolKey.value);
  }

  private splitKeys(value: string): string[] {
    return value
      .split(/[，,\s]+/)
      .map(key => key.trim())
      .filter(key => key.length > 0);
  }
}
