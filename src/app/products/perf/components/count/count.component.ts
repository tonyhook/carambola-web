import { AfterViewInit, Component, DestroyRef, inject, OnInit, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleChange, MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { catchError, debounceTime, forkJoin, of, Subject, switchMap } from 'rxjs';

import { ClientAPI, ClientChannelAPI, ClientProjectAPI, CountAPI, CountEventQuery, CountQuery, MediaAPI } from '../../api';
import { Client, ClientChannel, ClientProject, CountView, Media } from '../../entity';
import { formatEventValue } from '../../shared/event-value';
import { FIXED_EVENTS, formatMetric, METRIC_COLUMNS, MetricColumn, MetricSegment } from '../../shared/count-metric';
import { CountEventsDialogComponent } from '../count-events-dialog/count-events-dialog.component';

type CountInterval = 'hour' | 'day';
type CountLevel = 'client' | 'project' | 'channel';

interface CountFilterControls {
  clientId: FormControl<number | null>;
  clientProjectId: FormControl<number | null>;
  media: FormControl<string | null>;
  operator: FormControl<string | null>;
  start: FormControl<Date | null>;
  end: FormControl<Date | null>;
}

interface OperatorOption {
  value: string;
  label: string;
}

@Component({
  selector: 'carambola-perf-count',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginator,
    MatPaginatorModule,
    MatProgressBarModule,
    MatSelectModule,
    MatSort,
    MatSortModule,
    MatTableModule,
  ],
  templateUrl: './count.component.html',
  styleUrls: ['./count.component.scss'],
})
export class CountComponent implements OnInit, AfterViewInit {
  private destroyRef = inject(DestroyRef);
  private formBuilder = inject(FormBuilder);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private countAPI = inject(CountAPI);
  private clientAPI = inject(ClientAPI);
  private clientChannelAPI = inject(ClientChannelAPI);
  private clientProjectAPI = inject(ClientProjectAPI);
  private mediaAPI = inject(MediaAPI);

  interval: CountInterval = 'day';
  level: CountLevel = 'client';
  loading = false;

  clients: Client[] = [];
  clientProjects: ClientProject[] = [];
  mediaList: Media[] = [];
  operatorOptions: OperatorOption[] = [];
  mediaMap = new Map<string, Media>();

  displayedColumns: string[] = ['time', 'client'];
  readonly metricColumns: MetricColumn[] = METRIC_COLUMNS;
  private readonly metricMap = new Map(METRIC_COLUMNS.map(column => [column.key, column]));
  eventColumns: {key: string; event: string; label: string}[] = [];
  candidateColumns: {key: string; label: string}[] = [];
  // 记录取消勾选的列而非勾选的列：其他事件列随查询结果变化，新出现的默认显示
  private hiddenColumns = new Set<string>();
  columnControl = new FormControl<string[]>([], {nonNullable: true});
  dataSource = new MatTableDataSource<CountView>([]);
  // 全部行（不止当前页）相加，率和成本由加总后的量重新算
  total: CountView = this.sumCounts([]);
  // 客户、产品、媒体方、执行方都相同的多个渠道配对,只能靠媒体方代码区分。
  // 按渠道配置判断而非按查询结果,否则只有一个渠道有数据时看不出是哪个
  indistinctChannelIds = new Set<number>();
  dataRequest$ = new Subject<CountQuery>();

  readonly sort = viewChild(MatSort);
  readonly paginator = viewChild(MatPaginator);

  formGroupFilter: FormGroup<CountFilterControls> = this.formBuilder.group({
    clientId: this.formBuilder.control<number | null>(null),
    clientProjectId: this.formBuilder.control<number | null>(null),
    media: this.formBuilder.control<string | null>(null),
    operator: this.formBuilder.control<string | null>(null),
    start: this.formBuilder.control<Date | null>(new Date()),
    end: this.formBuilder.control<Date | null>(new Date()),
  });

  get filteredClientProjects(): ClientProject[] {
    const clientId = this.formGroupFilter.controls.clientId.value;
    if (clientId === null) {
      return this.clientProjects;
    }

    return this.clientProjects.filter(project => project.client?.id === clientId);
  }

  ngOnInit() {
    this.resetRange(this.interval);

    forkJoin({
      clients: this.clientAPI.getClientList().pipe(catchError(() => of([]))),
      clientChannels: this.clientChannelAPI.getClientChannelList().pipe(catchError(() => of([]))),
      clientProjects: this.clientProjectAPI.getClientProjectList().pipe(catchError(() => of([]))),
      mediaList: this.mediaAPI.getMediaList().pipe(catchError(() => of([]))),
    }).subscribe(({clients, clientChannels, clientProjects, mediaList}) => {
      this.clients = clients.filter(client => !client.deleted);
      this.clientProjects = clientProjects.filter(project => !project.deleted);
      this.mediaList = mediaList.filter(media => !media.deleted);
      this.mediaMap = new Map(this.mediaList.map(media => [this.getResourceKey(media), media]));
      this.operatorOptions = this.createOperatorOptions(clientChannels.filter(channel => !channel.deleted));
      // 已删除的渠道也算:查历史区间时它的数据仍会出现
      this.indistinctChannelIds = this.collectIndistinctChannelIds(clientChannels);
    });

    this.dataRequest$.pipe(
      debounceTime(200),
      switchMap(query => {
        this.loading = true;
        return this.countAPI.getCountList(query).pipe(catchError(() => {
          this.snackBar.open('统计数据加载失败，请稍后重试', '关闭');
          return of([]);
        }));
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(counts => {
      this.loading = false;
      this.eventColumns = this.collectEventColumns(counts);
      this.updateCandidateColumns();
      this.updateDisplayedColumns();
      this.dataSource.data = counts;
      this.total = this.sumCounts(counts);
      this.dataSource.sort = this.sort() ?? null;
      this.dataSource.paginator = this.paginator() ?? null;
      this.dataSource.sortingDataAccessor = (row, column) => {
        if (column.startsWith('event_')) {
          return this.getEventCount(row, column.substring('event_'.length));
        }
        const metric = this.metricMap.get(column);
        if (metric) {
          return metric.value(row) ?? -1;
        }

        return (row as unknown as Record<string, string | number | null>)[column] ?? '';
      };
    });

    this.formGroupFilter.controls.clientId.valueChanges.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      const project = this.formGroupFilter.controls.clientProjectId.value;
      if (project !== null && !this.filteredClientProjects.some(item => item.id === project)) {
        this.formGroupFilter.controls.clientProjectId.setValue(null);
      }
    });

    this.columnControl.valueChanges.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(selected => {
      const shown = new Set(selected);
      this.hiddenColumns = new Set(this.candidateColumns.map(column => column.key).filter(key => !shown.has(key)));
      this.updateDisplayedColumns();
    });

    this.formGroupFilter.valueChanges.pipe(
      debounceTime(200),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => this.query());
  }

  ngAfterViewInit() {
    this.query();
  }

  changeInterval(event: MatButtonToggleChange) {
    this.interval = event.value;
    this.resetRange(this.interval);
    this.query();
  }

  changeLevel(event: MatButtonToggleChange) {
    this.level = event.value;
    this.query();
  }

  clear(field: keyof CountFilterControls) {
    this.formGroupFilter.controls[field].setValue(null);
  }

  query() {
    this.dataRequest$.next({
      interval: this.interval,
      level: this.level,
      timezoneOffset: -new Date().getTimezoneOffset(),
      start: this.formatStart(),
      end: this.formatEnd(),
      clientId: this.formGroupFilter.controls.clientId.value,
      clientProjectId: this.formGroupFilter.controls.clientProjectId.value,
      media: this.formGroupFilter.controls.media.value,
      operator: this.formGroupFilter.controls.operator.value,
    });
  }

  getMediaValue(media: Media): string {
    return media.code ?? media.name;
  }

  getResourceLabel(resource: Media): string {
    const code = resource.code;
    if (!code || code === resource.name) {
      return resource.name;
    }

    return `${resource.name} (${code})`;
  }

  private collectIndistinctChannelIds(channels: ClientChannel[]): Set<number> {
    const channelIdsByLabel = new Map<string, Set<number>>();
    for (const channel of channels) {
      if (channel.id === null) {
        continue;
      }
      const label = [channel.client?.id, channel.clientProject?.id, channel.mediaName, channel.operator?.trim() ?? ''].join('|');
      const channelIds = channelIdsByLabel.get(label) ?? new Set<number>();
      channelIds.add(channel.id);
      channelIdsByLabel.set(label, channelIds);
    }

    return new Set([...channelIdsByLabel.values()].filter(channelIds => channelIds.size > 1).flatMap(channelIds => [...channelIds]));
  }

  getMediaDisplayName(row: CountView): string {
    if (!row.media) {
      return '';
    }

    return this.mediaMap.get(row.media)?.name ?? row.media;
  }

  getEventCount(row: CountView, event: string): number {
    return row.eventCounts?.[event] ?? 0;
  }

  getEventRawCount(row: CountView, event: string): number {
    return row.eventRawCounts?.[event] ?? 0;
  }

  getEventValue(row: CountView, event: string): number {
    return row.eventAmounts?.[event] ?? 0;
  }

  hasEventValue(row: CountView, event: string): boolean {
    return Object.prototype.hasOwnProperty.call(row.eventAmounts ?? {}, event);
  }

  formatEventValue(row: CountView, event: string): string {
    return formatEventValue(event, this.getEventValue(row, event));
  }

  formatMetricValue(row: CountView, column: MetricColumn): string {
    return formatMetric(column.value(row), column.kind);
  }

  formatSegmentValue(row: CountView, column: MetricColumn, segment: MetricSegment): string {
    return formatMetric(segment.value(row), column.kind);
  }

  formatSegmentValues(row: CountView, column: MetricColumn): string {
    return (column.segments ?? []).map(segment => this.formatSegmentValue(row, column, segment)).join('/');
  }

  formatSegmentSum(row: CountView, column: MetricColumn): string {
    const sum = (column.segments ?? []).reduce((total, segment) => total + (segment.value(row) ?? 0), 0);
    return formatMetric(sum, column.kind);
  }

  formatSegmentRawSum(row: CountView, column: MetricColumn): string {
    const sum = (column.segments ?? []).reduce((total, segment) => total + this.getEventRawCount(row, segment.event), 0);
    return formatMetric(sum, 'count');
  }

  formatSegmentRawCounts(row: CountView, column: MetricColumn): string {
    return (column.segments ?? []).map(segment => formatMetric(this.getEventRawCount(row, segment.event), 'count')).join('/');
  }

  isMetricClickable(row: CountView, column: MetricColumn): boolean {
    return column.event !== undefined && this.getEventRawCount(row, column.event) > 0;
  }

  showMetricEvents(row: CountView, column: MetricColumn) {
    if (column.event === undefined) {
      return;
    }

    this.showRecentEvents(row, column.event);
  }

  showRecentEvents(row: CountView, event: string) {
    if (this.getEventRawCount(row, event) === 0) {
      return;
    }

    const period = this.getPeriodRange(row.time);
    const query: CountEventQuery = {
      start: period.start,
      end: period.end,
      event,
      clientId: row.clientId ?? this.formGroupFilter.controls.clientId.value,
      clientProjectId: row.clientProjectId ?? this.formGroupFilter.controls.clientProjectId.value,
      clientChannelId: row.clientChannelId,
      media: row.media ?? this.formGroupFilter.controls.media.value,
      operator: this.getOperatorQueryValue(row),
    };

    this.dialog.open(CountEventsDialogComponent, {
      data: {
        mediaNames: Object.fromEntries(Array.from(this.mediaMap.entries()).map(([key, media]) => [key, media.name])),
        query,
      },
      minWidth: '720px',
      maxWidth: '90vw',
    });
  }

  private updateCandidateColumns() {
    this.candidateColumns = [
      ...this.metricColumns.map(column => ({key: column.key, label: column.label})),
      ...this.eventColumns.map(column => ({key: column.key, label: column.label})),
    ];
    this.columnControl.setValue(
      this.candidateColumns.map(column => column.key).filter(key => !this.hiddenColumns.has(key)),
      {emitEvent: false},
    );
  }

  private updateDisplayedColumns() {
    this.displayedColumns = ['time', 'client'];
    if (this.level === 'project' || this.level === 'channel') {
      this.displayedColumns.push('project');
    }
    if (this.level === 'channel') {
      this.displayedColumns.push('media');
    }
    this.displayedColumns.push(...this.candidateColumns.map(column => column.key).filter(key => !this.hiddenColumns.has(key)));
  }

  private sumCounts(rows: CountView[]): CountView {
    const total: CountView = {
      time: '',
      clientId: null,
      clientName: null,
      clientProjectId: null,
      clientProjectName: null,
      media: null,
      mediaCode: null,
      operator: null,
      clientChannelId: null,
      spend: 0,
      eventCounts: {},
      eventUserCounts: {},
      eventRawCounts: {},
      eventAmounts: {},
      eventNames: {},
    };
    for (const row of rows) {
      total.spend += row.spend ?? 0;
      this.addTo(total.eventCounts, row.eventCounts);
      this.addTo(total.eventRawCounts, row.eventRawCounts);
      this.addTo(total.eventAmounts, row.eventAmounts);
    }

    return total;
  }

  private addTo(target: Record<string, number>, source: Record<string, number> | undefined) {
    for (const [key, value] of Object.entries(source ?? {})) {
      target[key] = (target[key] ?? 0) + value;
    }
  }

  private collectEventColumns(rows: CountView[]): {key: string; event: string; label: string}[] {
    const labels = new Map<string, string>();
    for (const row of rows) {
      for (const event of Object.keys(row.eventCounts ?? {})) {
        if (FIXED_EVENTS.includes(event)) {
          continue;
        }
        labels.set(event, row.eventNames?.[event] || event);
      }
    }

    return Array.from(labels.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([event, label]) => ({
        key: 'event_' + event,
        event,
        label,
      }));
  }

  private getResourceKey(resource: Media): string {
    return resource.code || resource.name;
  }

  private createOperatorOptions(channels: ClientChannel[]): OperatorOption[] {
    const options = new Map<string, OperatorOption>();
    for (const channel of channels) {
      const operator = channel.operator?.trim();
      const value = operator || channel.mediaName;
      if (!value || options.has(value)) {
        continue;
      }

      options.set(value, {
        value,
        label: operator || this.mediaMap.get(channel.mediaName)?.name || channel.mediaName,
      });
    }

    return Array.from(options.values()).sort((a, b) => a.label.localeCompare(b.label));
  }

  private getOperatorQueryValue(row: CountView): string | null {
    if (row.clientChannelId !== null) {
      return row.operator?.trim() || row.media;
    }

    return this.formGroupFilter.controls.operator.value;
  }

  private getPeriodRange(time: string): {start: string; end: string} {
    if (this.interval === 'hour') {
      const start = this.parseDateTime(time);
      const end = new Date(start);
      end.setHours(end.getHours() + 1);

      return {
        start: this.formatDateTime(start),
        end: this.formatDateTime(end),
      };
    }

    const start = this.parseDateTime(time + ' 00:00:00');
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    return {
      start: this.formatDateTime(start),
      end: this.formatDateTime(end),
    };
  }

  private parseDateTime(value: string): Date {
    const [datePart, timePart = '00:00:00'] = value.split(' ');
    const [year, month, day] = datePart.split('-').map(part => Number(part));
    const [hour, minute, second] = timePart.split(':').map(part => Number(part));

    return new Date(year, month - 1, day, hour, minute, second);
  }

  private resetRange(interval: CountInterval) {
    const end = new Date();
    const start = new Date(end);
    if (interval === 'hour') {
      start.setHours(start.getHours() - 24);
    } else {
      start.setDate(start.getDate() - 6);
    }

    this.formGroupFilter.patchValue({start, end}, {emitEvent: false});
  }

  private formatStart(): string {
    const value = this.formGroupFilter.controls.start.value;
    if (this.interval === 'hour') {
      return this.formatDateTime(value ?? this.hoursAgo(24));
    }

    return this.formatDate(value, false);
  }

  private formatEnd(): string {
    const value = this.formGroupFilter.controls.end.value;
    if (this.interval === 'hour') {
      return this.formatHourEnd(value);
    }

    return this.formatDate(value, true);
  }

  private formatHourEnd(date: Date | null): string {
    const now = new Date();
    const value = date ? new Date(date) : now;
    if (this.isSameDate(value, now)) {
      return this.formatDateTime(now);
    }
    if (this.isStartOfDay(value)) {
      value.setDate(value.getDate() + 1);
    }

    return this.formatDateTime(value);
  }

  private isSameDate(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate();
  }

  private isStartOfDay(date: Date): boolean {
    return date.getHours() === 0
      && date.getMinutes() === 0
      && date.getSeconds() === 0
      && date.getMilliseconds() === 0;
  }

  private hoursAgo(hours: number): Date {
    const value = new Date();
    value.setHours(value.getHours() - hours);

    return value;
  }

  private formatDate(date: Date | null, end: boolean): string {
    const value = date ? new Date(date) : new Date();
    if (end) {
      value.setDate(value.getDate() + 1);
    }
    value.setHours(0, 0, 0, 0);
    return value.toISOString();
  }

  private formatDateTime(date: Date): string {
    return date.toISOString();
  }
}
