import { AfterViewInit, Component, DestroyRef, inject, OnInit, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { catchError, debounceTime, forkJoin, of, Subject, switchMap } from 'rxjs';

import { IsNewPipe } from '../../../../shared';
import { ClientChannel, ClientChannelAPI, ClientChannelRouteView, EventCatalogAPI, Media, MediaAPI, PerfQuery, TenantService, Track, TrackAPI } from '../..';
import { ClientChannelDialogComponent } from '../client-channel-dialog/client-channel-dialog.component';

interface ClientChannelQueryControls {
  search: FormControl<string>;
}

@Component({
  selector: 'carambola-perf-client-channel-manager',
  imports: [
    ReactiveFormsModule,
    MatBadgeModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginator,
    MatPaginatorModule,
    MatSort,
    MatSortModule,
    MatTableModule,
    IsNewPipe,
  ],
  templateUrl: './client-channel.component.html',
  styleUrls: ['./client-channel.component.scss'],
})
export class ClientChannelManagerComponent implements OnInit, AfterViewInit {
  private destroyRef = inject(DestroyRef);
  private formBuilder = inject(FormBuilder);
  private dialog = inject(MatDialog);
  private clientChannelAPI = inject(ClientChannelAPI);
  private eventCatalogAPI = inject(EventCatalogAPI);
  private mediaAPI = inject(MediaAPI);
  private trackAPI = inject(TrackAPI);
  tenantService = inject(TenantService);

  displayedColumns: string[] = ['project', 'mediaCode', 'routes', 'actions'];
  hoverRow: ClientChannel | null = null;
  mediaMap = new Map<string, Media>();
  trackMap = new Map<string, Track>();
  eventNameMap = new Map<string, string>();
  routeMap = new Map<number, ClientChannelRouteView[]>();

  formGroupQuery: FormGroup<ClientChannelQueryControls> = this.formBuilder.group({
    search: this.formBuilder.nonNullable.control(''),
  });
  formQuery: PerfQuery<ClientChannel> = {
    filter: {},
    searchKey: ['clientProject', 'mediaName', 'mediaCode', 'operator', 'trackName', 'trackCode'],
    searchValue: '',
  };

  readonly sort = viewChild(MatSort);
  readonly paginator = viewChild(MatPaginator);
  dataRequest$ = new Subject<PerfQuery<ClientChannel>>();
  dataSource = new MatTableDataSource<ClientChannel>([]);

  get searchValue(): string {
    return this.formGroupQuery.controls.search.value;
  }

  ngOnInit() {
    this.mediaAPI.getMediaList().subscribe(mediaList => {
      this.mediaMap = new Map(mediaList.filter(media => !media.deleted).map(media => [this.getResourceKey(media), media]));
    });
    this.trackAPI.getTrackList().subscribe(trackList => {
      this.trackMap = new Map(trackList.filter(track => !track.deleted).map(track => [this.getResourceKey(track), track]));
    });
    this.eventCatalogAPI.getMediaEvents().subscribe(options => {
      this.eventNameMap = new Map(options.events.map(event => [event.event, event.name]));
    });

    this.dataRequest$.pipe(
      debounceTime(500),
      switchMap(query =>
        forkJoin({
          channels: this.clientChannelAPI.getClientChannelList(query).pipe(catchError(() => of([]))),
          routes: this.clientChannelAPI.getAllRoutes().pipe(catchError(() => of([]))),
        })
      ),
    ).subscribe(({channels, routes}) => {
      this.routeMap = this.groupRoutes(routes);
      this.dataSource.data = channels
        .filter(channel => !channel.deleted)
        .sort((a, b) => this.compareUpdateTime(a.updateTime, b.updateTime));
      this.dataSource.sort = this.sort() ?? null;
      this.dataSource.paginator = this.paginator() ?? null;
    });

    this.formGroupQuery.valueChanges.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => this.query());
  }

  ngAfterViewInit() {
    this.query();
  }

  mouseenter(row: ClientChannel) {
    this.hoverRow = row;
  }

  mouseleave() {
    this.hoverRow = null;
  }

  query() {
    this.formQuery = {
      filter: {},
      searchKey: ['clientProject', 'mediaName', 'mediaCode', 'operator', 'trackName', 'trackCode'],
      searchValue: this.searchValue,
    };
    this.dataRequest$.next(this.formQuery);
  }

  clear(event: Event, field: keyof ClientChannelQueryControls, value: string) {
    event.stopPropagation();
    this.formGroupQuery.patchValue({[field]: value});
    this.query();
  }

  newClientChannel() {
    this.openDialog(null);
  }

  modifyClientChannel(clientChannel: ClientChannel) {
    this.openDialog(clientChannel);
  }

  getProjectLabel(row: ClientChannel): string {
    return `${row.clientProject?.client?.name ?? row.client?.name ?? ''} / ${row.clientProject?.name ?? ''}`;
  }

  getMediaName(row: ClientChannel): string {
    return this.mediaMap.get(row.mediaName)?.name ?? row.mediaName;
  }

  getMediaTitle(row: ClientChannel): string {
    const operator = row.operator?.trim();
    if (!operator) {
      return this.getMediaName(row);
    }

    return `${this.getMediaName(row)} (${operator})`;
  }

  getRoutes(row: ClientChannel): ClientChannelRouteView[] {
    return row.id ? this.routeMap.get(row.id) ?? [] : [];
  }

  getRouteEventName(route: ClientChannelRouteView): string {
    return this.eventNameMap.get(route.event) ?? route.event;
  }

  getRouteTrackTitle(route: ClientChannelRouteView): string {
    const name = this.trackMap.get(route.trackName)?.name ?? route.trackName;
    return name === route.trackName ? name : `${name} (${route.trackName})`;
  }

  private getResourceKey(resource: Media | Track): string {
    return resource.code || resource.name;
  }

  private groupRoutes(routes: ClientChannelRouteView[]): Map<number, ClientChannelRouteView[]> {
    const routeMap = new Map<number, ClientChannelRouteView[]>();
    for (const route of routes) {
      const clientChannelId = route.clientChannelId;
      routeMap.set(clientChannelId, [...(routeMap.get(clientChannelId) ?? []), route]);
    }
    return routeMap;
  }

  private openDialog(clientChannel: ClientChannel | null) {
    const dialogRef = this.dialog.open(ClientChannelDialogComponent, {
      data: clientChannel,
      minWidth: '720px',
      maxWidth: '80vw',
      width: '720px',
    });
    dialogRef.afterClosed().subscribe(changed => {
      if (changed) {
        this.query();
      }
    });
  }

  private compareUpdateTime(a: string | null, b: string | null): number {
    const keya = a ? new Date(a) : new Date(0);
    const keyb = b ? new Date(b) : new Date(0);

    return keya < keyb ? 1 : keya > keyb ? -1 : 0;
  }
}
