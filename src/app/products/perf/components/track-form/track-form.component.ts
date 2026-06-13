import { Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';

import { TenantService, Track, TrackAPI } from '../..';

interface TrackFormControls {
  name: FormControl<string>;
  code: FormControl<string>;
  protocolKey: FormControl<string>;
  remark: FormControl<string | null>;
}

@Component({
  selector: 'carambola-perf-track-form',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatTabsModule,
  ],
  templateUrl: './track-form.component.html',
  styleUrls: ['./track-form.component.scss'],
})
export class TrackFormComponent {
  private formBuilder = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private trackAPI = inject(TrackAPI);
  tenantService = inject(TenantService);

  track = input<Track | null>(null);
  changed = output<boolean>();

  formGroup: FormGroup<TrackFormControls> = this.formBuilder.group({
    name: this.formBuilder.nonNullable.control('', Validators.required),
    code: this.formBuilder.nonNullable.control('', Validators.required),
    protocolKey: this.formBuilder.nonNullable.control('', Validators.required),
    remark: this.formBuilder.control<string | null>(''),
  });

  constructor() {
    effect(() => {
      const track = this.track();
      if (!track) {
        return;
      }

      this.formGroup.patchValue({
        name: track.name ?? '',
        code: track.code ?? '',
        protocolKey: track.protocolKey?.join(',') ?? '',
        remark: track.remark ?? '',
      }, {emitEvent: false});

      if (!this.tenantService.isManager()) {
        this.formGroup.disable({emitEvent: false});
      }
    });
  }

  saveTrack() {
    if (!this.formGroup.valid) {
      this.formGroup.markAllAsTouched();
      return;
    }

    const current = this.track();
    const protocolKey = this.getProtocolKey();
    if (protocolKey.length === 0) {
      this.formGroup.controls.protocolKey.setErrors({required: true});
      this.formGroup.controls.protocolKey.markAsTouched();
      return;
    }

    const track: Track = {
      id: current?.id ?? null,
      deleted: current?.deleted ?? false,
      name: this.formGroup.controls.name.value,
      code: this.formGroup.controls.code.value,
      protocolKey,
      remark: this.formGroup.controls.remark.value,
      createTime: current?.createTime ?? null,
      updateTime: current?.updateTime ?? null,
    };
    const request = current?.id
      ? this.trackAPI.updateTrack(current.id, track)
      : this.trackAPI.addTrack(track);
    request.subscribe(() => {
      this.snackBar.open(current ? '监测方已修改' : '监测方已创建', 'OK', {
        duration: 2000,
      });
      this.changed.emit(true);
    });
  }

  removeTrack() {
    const track = this.track();
    if (!track?.id) {
      return;
    }

    this.trackAPI.removeTrack(track.id).subscribe(() => {
      this.snackBar.open('监测方已删除', 'OK', {
        duration: 2000,
      });
      this.changed.emit(true);
    });
  }

  cancelTrack() {
    this.changed.emit(false);
  }

  private getProtocolKey(): string[] {
    return this.formGroup.controls.protocolKey.value
      .split(/[，,\s]+/)
      .map(key => key.trim())
      .filter(key => key.length > 0);
  }
}
