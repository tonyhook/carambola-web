import { Clipboard, ClipboardModule } from '@angular/cdk/clipboard';
import { Component, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, FormGroup, FormRecord, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { debounceTime } from 'rxjs';

import { ClientChannelRoute, Media, MediaAPI, PerfEventOption, PerfEventOptions, Track } from '../..';

interface RouteFormControls {
  event: FormControl<string>;
  track: FormControl<Track | null>;
}

@Component({
  selector: 'carambola-perf-client-channel-route-editor',
  imports: [
    ClipboardModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
  ],
  templateUrl: './client-channel-route-editor.component.html',
  styleUrls: ['./client-channel-route-editor.component.scss'],
})
export class ClientChannelRouteEditorComponent {
  private clipboard = inject(Clipboard);
  private destroyRef = inject(DestroyRef);
  private formBuilder = inject(FormBuilder);
  private mediaAPI = inject(MediaAPI);
  private snackBar = inject(MatSnackBar);

  route = input.required<ClientChannelRoute>();
  media = input<Media | null>(null);
  mediaCode = input('');
  trackList = input.required<Track[]>();
  eventOptions = input<PerfEventOptions | null>(null);
  readonly = input(false);
  routeRemoved = output<ClientChannelRoute>();
  eventUrl = signal('');
  private eventUrlRequestId = 0;
  private generatedTrackCode = this.createTimestampCode();

  formGroup: FormGroup<RouteFormControls> = this.formBuilder.group({
    event: this.formBuilder.nonNullable.control('', Validators.required),
    track: this.formBuilder.control<Track | null>(null, Validators.required),
  });
  trackProtocolForm = new FormRecord<FormControl<string>>({});

  constructor() {
    effect(() => {
      const route = this.route();
      const tracks = this.trackList();
      const track = tracks.find(item => this.getResourceKey(item) === route.trackName || item.name === route.trackName) ?? null;
      this.formGroup.controls.event.setValue(route.event, {emitEvent: false});
      this.formGroup.controls.track.setValue(track, {emitEvent: false});
      this.resetProtocolForm(track?.protocolKey ?? [], route.trackCode ?? '');
      this.setDisabledState();
      this.updateEventUrl();
    });

    this.formGroup.controls.track.valueChanges.subscribe(track => {
      this.resetProtocolForm(track?.protocolKey ?? []);
    });

    this.formGroup.controls.event.valueChanges.pipe(
      debounceTime(200),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => this.updateEventUrl());
  }

  getValue(): ClientChannelRoute | null {
    if (!this.formGroup.valid || !this.trackProtocolForm.valid) {
      this.formGroup.markAllAsTouched();
      this.trackProtocolForm.markAllAsTouched();
      return null;
    }
    const track = this.formGroup.controls.track.value;
    if (!track) {
      return null;
    }

    const current = this.route();
    return {
      ...current,
      event: this.formGroup.controls.event.value.trim(),
      trackName: this.getResourceKey(track),
      trackCode: this.buildProtocolValue(track.protocolKey ?? []),
    };
  }

  remove() {
    this.routeRemoved.emit(this.route());
  }

  copyEventUrl() {
    const eventUrl = this.eventUrl();
    if (!eventUrl) {
      return;
    }
    this.clipboard.copy(eventUrl);
    this.snackBar.open('链接已复制', 'OK', {duration: 2000});
  }

  compareTrack(a: Track | null, b: Track | null): boolean {
    return a?.id === b?.id;
  }

  getTrackLabel(track: Track): string {
    const code = this.getResourceKey(track);
    return !code || code === track.name ? track.name : `${track.name} (${code})`;
  }

  getEventLabel(event: PerfEventOption): string {
    return event.category ? `${event.category} / ${event.name}` : event.name;
  }

  private resetProtocolForm(protocolKeys: string[], value = '') {
    for (const key of Object.keys(this.trackProtocolForm.controls)) {
      this.trackProtocolForm.removeControl(key, {emitEvent: false});
    }
    const values = value.split('|');
    protocolKeys.forEach((key, index) => {
      this.trackProtocolForm.addControl(
        key,
        this.formBuilder.nonNullable.control(this.getProtocolDefaultValue(values, index), Validators.required),
        {emitEvent: false},
      );
    });
    this.setDisabledState();
  }

  private setDisabledState() {
    if (this.readonly()) {
      this.formGroup.disable({emitEvent: false});
      this.trackProtocolForm.disable({emitEvent: false});
    } else {
      this.formGroup.enable({emitEvent: false});
      this.trackProtocolForm.enable({emitEvent: false});
    }
  }

  private buildProtocolValue(protocolKeys: string[]): string {
    return protocolKeys.map(key => this.trackProtocolForm.controls[key]?.value ?? '').join('|');
  }

  private createTimestampCode(): string {
    return Math.round(new Date().getTime() / 1000).toString(16).toUpperCase();
  }

  private getProtocolDefaultValue(values: string[], index: number): string {
    if (values[index]) {
      return values[index];
    }
    const track = this.formGroup.controls.track.value;
    if (this.route().id !== null || !track || this.getResourceKey(track) !== 'davidia') {
      return '';
    }
    return index === 1 ? this.generatedTrackCode : '';
  }

  private updateEventUrl() {
    const media = this.media();
    const event = this.formGroup.controls.event.value.trim();
    if (!media?.id || !event) {
      this.eventUrl.set('');
      return;
    }

    const requestId = ++this.eventUrlRequestId;
    this.mediaAPI.getMediaEventUrl(media.id, this.mediaCode(), event).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: eventUrl => {
        if (requestId === this.eventUrlRequestId) {
          this.eventUrl.set(eventUrl);
        }
      },
      error: () => {
        if (requestId === this.eventUrlRequestId) {
          this.eventUrl.set('');
        }
      },
    });
  }

  private getResourceKey(track: Track): string {
    return track.code || track.name;
  }
}
