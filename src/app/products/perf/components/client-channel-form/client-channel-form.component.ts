import { Component, DestroyRef, effect, inject, input, output, signal, viewChildren } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, FormGroup, FormRecord, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { forkJoin, Observable } from 'rxjs';

import { ClientChannel, ClientChannelAPI, ClientChannelRoute, ClientProject, ClientProjectAPI, EventCatalogAPI, Media, MediaAPI, PerfEventOptions, TenantService, Track, TrackAPI } from '../..';
import { ClientChannelRouteEditorComponent } from '../client-channel-route-editor/client-channel-route-editor.component';

interface ClientChannelFormControls {
  clientProject: FormControl<ClientProject | null>;
  media: FormControl<Media | null>;
  operator: FormControl<string>;
  track: FormControl<Track | null>;
  filterInvalidId: FormControl<boolean>;
  cpc: FormControl<number | null>;
  remark: FormControl<string>;
}

@Component({
  selector: 'carambola-perf-client-channel-form',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTabsModule,
    ClientChannelRouteEditorComponent,
  ],
  templateUrl: './client-channel-form.component.html',
  styleUrls: ['./client-channel-form.component.scss'],
})
export class ClientChannelFormComponent {
  private destroyRef = inject(DestroyRef);
  private formBuilder = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private clientProjectAPI = inject(ClientProjectAPI);
  private clientChannelAPI = inject(ClientChannelAPI);
  private eventCatalogAPI = inject(EventCatalogAPI);
  private mediaAPI = inject(MediaAPI);
  private trackAPI = inject(TrackAPI);
  tenantService = inject(TenantService);

  clientChannel = input<ClientChannel | null>(null);
  changed = output<boolean>();
  clientProjects = signal<ClientProject[]>([]);
  mediaList = signal<Media[]>([]);
  trackList = signal<Track[]>([]);
  routes = signal<ClientChannelRoute[]>([]);
  readonly = false;
  mediaEventOptions = signal<PerfEventOptions | null>(null);
  private routeEditors = viewChildren(ClientChannelRouteEditorComponent);
  private generatedMediaCode = this.createTimestampCode();

  formGroup: FormGroup<ClientChannelFormControls> = this.formBuilder.group({
    clientProject: this.formBuilder.control<ClientProject | null>(null, Validators.required),
    media: this.formBuilder.control<Media | null>(null, Validators.required),
    operator: this.formBuilder.nonNullable.control(''),
    track: this.formBuilder.control<Track | null>(null),
    filterInvalidId: this.formBuilder.nonNullable.control(false),
    cpc: this.formBuilder.control<number | null>(null, Validators.min(0)),
    remark: this.formBuilder.nonNullable.control(''),
  });
  mediaProtocolForm = new FormRecord<FormControl<string>>({});
  mediaSecretForm = new FormRecord<FormControl<string>>({});

  constructor() {
    this.clientProjectAPI.getClientProjectList().subscribe(clientProjects => {
      this.clientProjects.set(clientProjects.filter(clientProject => !clientProject.deleted));
    });
    this.mediaAPI.getMediaList().subscribe(mediaList => {
      this.mediaList.set(mediaList.filter(media => !media.deleted));
    });
    this.trackAPI.getTrackList().subscribe(trackList => {
      this.trackList.set(trackList.filter(track => !track.deleted));
    });
    this.eventCatalogAPI.getMediaEvents().subscribe(mediaEventOptions => {
      this.mediaEventOptions.set(mediaEventOptions);
    });

    this.formGroup.controls.media.valueChanges.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(media => {
      this.resetProtocolForm(this.mediaProtocolForm, media?.protocolKey ?? [], '', true);
      this.resetProtocolForm(this.mediaSecretForm, media?.secretKey ?? []);
    });

    effect(() => {
      const channel = this.clientChannel();
      const mediaList = this.mediaList();
      this.readonly = !this.tenantService.isTenantManager() && !this.tenantService.isManager();
      if (!channel) {
        this.routes.set([]);
        this.formGroup.controls.filterInvalidId.setValue(false, {emitEvent: false});
        this.formGroup.controls.cpc.setValue(null, {emitEvent: false});
        return;
      }

      this.loadRoutes(channel.id);

      const media = mediaList.find(currentMedia => this.getResourceKey(currentMedia) === channel.mediaName || currentMedia.name === channel.mediaName) ?? null;
      this.formGroup.controls.clientProject.setValue(channel.clientProject, {emitEvent: false});
      this.formGroup.controls.media.setValue(media, {emitEvent: false});
      this.formGroup.controls.operator.setValue(channel.operator ?? '', {emitEvent: false});
      this.formGroup.controls.filterInvalidId.setValue(Boolean(channel.filterInvalidId), {emitEvent: false});
      this.formGroup.controls.cpc.setValue(this.toYuan(channel.cpc), {emitEvent: false});
      this.resetProtocolForm(this.mediaProtocolForm, media?.protocolKey ?? [], channel.mediaCode, true);
      this.resetProtocolForm(this.mediaSecretForm, media?.secretKey ?? [], channel.mediaSecret ?? '');
      this.formGroup.controls.remark.setValue(channel.remark ?? '', {emitEvent: false});
      if (this.readonly) {
        this.formGroup.disable({emitEvent: false});
        this.mediaProtocolForm.disable({emitEvent: false});
        this.mediaSecretForm.disable({emitEvent: false});
      }
    });
  }

  saveClientChannel() {
    if (!this.formGroup.valid) {
      this.formGroup.markAllAsTouched();
      return;
    }

    const current = this.clientChannel();
    if (this.routes().length === 0) {
      this.snackBar.open('至少需要配置一条事件路由', 'OK', {duration: 3000});
      return;
    }

    const clientProject = this.formGroup.controls.clientProject.value;
    const media = this.formGroup.controls.media.value;
    if (!clientProject || !media) {
      return;
    }

    if (!this.mediaProtocolForm.valid) {
      this.mediaProtocolForm.markAllAsTouched();
      return;
    }

    if (!this.mediaSecretForm.valid) {
      this.mediaSecretForm.markAllAsTouched();
      return;
    }

    const routeValues: ClientChannelRoute[] = [];
    for (const editor of this.routeEditors()) {
      const route = editor.getValue();
      if (!route) {
        return;
      }
      routeValues.push(route);
    }
    if (this.hasDuplicateRoutes(routeValues)) {
      this.snackBar.open('事件路由重复，请删除或修改重复路由', 'OK', {duration: 3000});
      return;
    }
    const channel: ClientChannel = {
      id: current?.id ?? null,
      deleted: current?.deleted ?? false,
      client: clientProject.client,
      clientProject,
      mediaName: this.getResourceKey(media),
      mediaCode: this.buildProtocolValue(this.mediaProtocolForm, media.protocolKey ?? []),
      mediaSecret: this.buildProtocolValue(this.mediaSecretForm, media.secretKey ?? []) || null,
      operator: this.formGroup.controls.operator.value.trim() || null,
      filterInvalidId: this.formGroup.controls.filterInvalidId.value,
      cpc: this.toFen(this.formGroup.controls.cpc.value),
      remark: this.formGroup.controls.remark.value,
      createTime: current?.createTime ?? null,
      updateTime: current?.updateTime ?? null,
    };

    if (!current?.id) {
      this.createClientChannelWithRoutes(channel, routeValues);
      return;
    }

    const routeRequests: Observable<unknown>[] = routeValues.map(route => route.id === null
      ? this.clientChannelAPI.addRoute(current.id!, route)
      : this.clientChannelAPI.updateRoute(current.id!, route.id, route));
    forkJoin([this.clientChannelAPI.updateClientChannel(current.id, channel), ...routeRequests]).subscribe({
      next: () => {
        this.snackBar.open('监测关系已修改', 'OK', {duration: 2000});
        this.changed.emit(true);
      },
      error: () => {
        this.snackBar.open('修改失败，请检查配置后重试', 'OK', {duration: 3000});
      },
    });
  }

  private createClientChannelWithRoutes(channel: ClientChannel, routes: ClientChannelRoute[]) {
    this.clientChannelAPI.addClientChannel(channel).subscribe({
      next: createdChannel => {
        if (!createdChannel.id) {
          this.snackBar.open('创建失败：服务未返回监测关系 ID', 'OK', {duration: 3000});
          return;
        }
        const routeRequests = routes.map(route => this.clientChannelAPI.addRoute(createdChannel.id!, {
          ...route,
          clientChannel: createdChannel,
        }));
        forkJoin(routeRequests).subscribe({
          next: () => {
            this.snackBar.open('监测关系及事件路由已创建', 'OK', {duration: 2000});
            this.changed.emit(true);
          },
          error: () => {
            this.clientChannelAPI.removeClientChannel(createdChannel.id!).subscribe();
            this.snackBar.open('事件路由创建失败，监测关系已撤销，请重试', 'OK', {duration: 4000});
          },
        });
      },
      error: () => {
        this.snackBar.open('监测关系创建失败，请检查配置后重试', 'OK', {duration: 3000});
      },
    });
  }

  removeClientChannel() {
    const channel = this.clientChannel();
    if (!channel?.id) {
      return;
    }

    this.clientChannelAPI.removeClientChannel(channel.id).subscribe(() => {
      this.snackBar.open('监测关系已删除', 'OK', {
        duration: 2000,
      });
      this.changed.emit(true);
    });
  }

  cancelClientChannel() {
    this.changed.emit(false);
  }

  addRoute() {
    const channel = this.clientChannel();
    this.routes.update(routes => [
      ...routes,
      {
        id: null,
        clientChannel: channel,
        event: this.getDefaultMediaEvent(),
        trackName: '',
        trackCode: null,
        deleted: false,
        createTime: null,
        updateTime: null,
      },
    ]);
  }

  removeRoute(route: ClientChannelRoute) {
    if (route.id === null) {
      this.routes.update(routes => routes.filter(item => item !== route));
      return;
    }
    const channelId = this.clientChannel()?.id;
    if (!channelId) {
      return;
    }
    this.clientChannelAPI.removeRoute(channelId, route.id).subscribe(() => {
      this.snackBar.open('事件路由已删除', 'OK', {duration: 2000});
      this.loadRoutes(channelId);
    });
  }

  compareMedia(a: Media | null, b: Media | null): boolean {
    return a?.id === b?.id;
  }

  compareClientProject(a: ClientProject | null, b: ClientProject | null): boolean {
    return a?.id === b?.id;
  }

  getResourceLabel(resource: Media | Track): string {
    const code = this.getResourceKey(resource);
    if (!code || code === resource.name) {
      return resource.name;
    }

    return `${resource.name} (${code})`;
  }

  eventUrlMediaCode(): string {
    const media = this.formGroup.controls.media.value;
    return this.buildProtocolValue(this.mediaProtocolForm, media?.protocolKey ?? []);
  }

  private getResourceKey(resource: Media | Track): string {
    return resource.code || resource.name;
  }

  private toYuan(cpc: number | null): number | null {
    return cpc === null || cpc === undefined ? null : cpc / 100;
  }

  private toFen(cpc: number | null): number | null {
    return cpc === null || cpc === undefined ? null : Math.round(cpc * 100);
  }

  private loadRoutes(clientChannelId: number | null) {
    if (!clientChannelId) {
      this.routes.set([]);
      return;
    }
    this.clientChannelAPI.getRoutes(clientChannelId).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(routes => this.routes.set(routes));
  }

  private resetProtocolForm(form: FormRecord<FormControl<string>>, protocolKey: string[], value = '', generateDefault = false) {
    for (const key of Object.keys(form.controls)) {
      form.removeControl(key, {emitEvent: false});
    }

    const values = value.split('|');
    protocolKey.forEach((key, index) => {
      form.addControl(key, this.formBuilder.nonNullable.control(this.getProtocolDefaultValue(values, index, generateDefault), Validators.required), {emitEvent: false});
    });

    if (this.readonly) {
      form.disable({emitEvent: false});
    }
  }

  private createTimestampCode(): string {
    return Math.round(new Date().getTime() / 1000).toString(16).toUpperCase();
  }

  private getProtocolDefaultValue(values: string[], index: number, generateDefault: boolean): string {
    if (values[index]) {
      return values[index];
    }
    if (!generateDefault) {
      return '';
    }
    const media = this.formGroup.controls.media.value;
    if (this.clientChannel() || !media || this.getResourceKey(media) !== 'davidia') {
      return '';
    }
    return index === 0 ? this.generatedMediaCode : '';
  }

  private buildProtocolValue(form: FormRecord<FormControl<string>>, protocolKey: string[]): string {
    return protocolKey.map(key => form.controls[key]?.value ?? '').join('|');
  }

  private getDefaultMediaEvent(): string {
    return this.mediaEventOptions()?.defaultEvent ?? '';
  }

  private hasDuplicateRoutes(routes: ClientChannelRoute[]): boolean {
    const routeKeys = new Set<string>();
    for (const route of routes) {
      const routeKey = [
        route.event.trim(),
        route.trackName.trim(),
        route.trackCode?.trim() ?? '',
      ].join('\n');
      if (routeKeys.has(routeKey)) {
        return true;
      }
      routeKeys.add(routeKey);
    }
    return false;
  }
}
