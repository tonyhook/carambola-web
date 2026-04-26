import { AfterViewInit, ChangeDetectionStrategy, Component, DoCheck, effect, ElementRef, HostListener, inject, KeyValueDiffer, KeyValueDiffers, OnInit, signal, viewChild, WritableSignal } from '@angular/core';
import { CdkMenuModule } from '@angular/cdk/menu';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleChange, MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { ActivatedRoute } from '@angular/router';
import { asyncScheduler, catchError, debounceTime, forkJoin, scheduled, Subject, switchMap } from 'rxjs';

import { Bill, BillAPI, BillStatus, BillView, Client, ClientAPI, ClientMedia, ClientMediaAPI, ClientPort, ClientPortAPI, PartnerType, PerformancePlaceholder, Query } from '../../../../core';
import { TenantService } from '../../../../services';
import { AdEntityComponent, FilteredSelectClientComponent, FilteredSelectClientMediaComponent } from '../../../../shared';

interface UpstreamObserverQueryControls {
  client: FormControl<Client[]>;
  clientMedia: FormControl<ClientMedia[]>;
  format: FormControl<string[]>;
  mode: FormControl<string[]>;
  search: FormControl<string>;
}

interface UpstreamObserverRangeControls {
  start: FormControl<Date | null>;
  end: FormControl<Date | null>;
}

@Component({
  selector: 'carambola-upstream-observer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginator,
    MatPaginatorModule,
    MatSelectModule,
    MatSort,
    MatSortModule,
    MatTableModule,
    CdkMenuModule,
    FilteredSelectClientComponent,
    FilteredSelectClientMediaComponent,
    AdEntityComponent,
  ],
  templateUrl: './upstream-observer.component.html',
  styleUrls: ['./upstream-observer.component.scss'],
})
export class UpstreamObserverComponent implements OnInit, AfterViewInit, DoCheck {
  private formBuilder = inject(FormBuilder);
  private tenantService = inject(TenantService);
  private clientAPI = inject(ClientAPI);
  private clientMediaAPI = inject(ClientMediaAPI);
  private clientPortAPI = inject(ClientPortAPI);
  private billAPI = inject(BillAPI);
  private route = inject(ActivatedRoute);
  private readonly differs = inject(KeyValueDiffers);

  PartnerType = PartnerType;

  displayedColumns = signal<string[]>([]);
  displayedColumnsWidth = 0;
  scrollLeft = 0;
  scrollRight = 0;
  tableWidth = 0;

  clients: Client[] = [];
  clientMedias: ClientMedia[] = [];
  clientPorts: ClientPort[] = [];

  clientMap: Map<number | null, Client> = new Map<number | null, Client>();
  clientMediaMap: Map<number | null, ClientMedia> = new Map<number | null, ClientMedia>();
  clientPortMap: Map<number | null, ClientPort> = new Map<number | null, ClientPort>();

  mode: WritableSignal<PartnerType> = signal(PartnerType.PARTNER_TYPE_UNKNOWN);
  formGroupQuery: FormGroup<UpstreamObserverQueryControls>;
  filterMode: Map<string, string>;
  formQuery: Query<PerformancePlaceholder> = {
    filter: {},
    searchKey: ['name', 'tagId'],
    searchValue: '',
  };
  range: FormGroup<UpstreamObserverRangeControls>;
  differ: KeyValueDiffer<string, unknown>;

  billAggregateUpstream = 'all';
  billInterval = 'day';
  billStart = new Date();
  billEnd = new Date();

  minTimestamp: Date = new Date();
  maxTimestamp: Date = new Date();
  billData: Bill[] = [];
  billViewData: BillView[] = [];
  billViewDataSelected: BillView[] = [];
  billViewFullyBilled = false;
  billViewFullyUnbilled = false;
  billViewMap: Map<string, BillView> = new Map<string, BillView>();
  billViewTotal: BillView = {
    time: '',
    start: new Date(),
    end: new Date(),
    client: 0,
    vendor: 0,
    clientMedia: 0,
    vendorMedia: 0,
    clientPort: 0,
    vendorPort: 0,
    request: null,
    response: null,
    impression: null,
    click: null,
    cost: null,
    status: BillStatus.BILL_STATUS_PENDING,
    closed: 0,
    total: 0,
  };

  readonly sort = viewChild(MatSort);
  readonly paginator = viewChild(MatPaginator);
  readonly table = viewChild<ElementRef>('table');

  dataRequest$ = new Subject<Query<PerformancePlaceholder>>();
  dataSource = signal(this.createDataSource([]));

  constructor() {
    this.formGroupQuery = this.formBuilder.group({
      client: this.formBuilder.nonNullable.control<Client[]>([]),
      clientMedia: this.formBuilder.nonNullable.control<ClientMedia[]>([]),
      format: this.formBuilder.nonNullable.control<string[]>([]),
      mode: this.formBuilder.nonNullable.control<string[]>([]),
      search: this.formBuilder.nonNullable.control(''),
    });

    this.filterMode = new Map([
      ['1', '分成模式'],
      ['2', '竞价模式'],
      ['3', '直通模式'],
    ]);

    this.range = this.formBuilder.group({
      start: this.formBuilder.control<Date | null>(null),
      end: this.formBuilder.control<Date | null>(null),
    });
    this.differ = this.differs.find(this.range.getRawValue()).create();

    effect(() => {
      const mode = this.mode();
      const tenant = this.tenantService.tenant();

      if (mode === PartnerType.PARTNER_TYPE_UNKNOWN) {
        return;
      }
      if (!tenant) {
        return;
      }

      this.dataSource.set(this.createDataSource([]));
      this.billViewTotal = {
        time: '',
        start: new Date(),
        end: new Date(),
        client: 0,
        vendor: 0,
        clientMedia: 0,
        vendorMedia: 0,
        clientPort: 0,
        vendorPort: 0,
        request: null,
        response: null,
        impression: null,
        click: null,
        cost: null,
        status: BillStatus.BILL_STATUS_IGNORE,
        closed: 0,
        total: 0,
      };

      forkJoin([
        this.clientAPI.getClientList({
          filter: {
            mode: [String(mode)],
          },
          searchKey: [],
          searchValue: '',
        }),
        this.clientMediaAPI.getClientMediaList({
          filter: {
            clientMode: [String(mode)],
          },
          searchKey: [],
          searchValue: '',
        }),
        this.clientPortAPI.getClientPortList({
          filter: {
            clientMode: [String(mode)],
          },
          searchKey: [],
          searchValue: '',
        }),
      ]).subscribe(results => {
        this.clients = results[0].filter(client => !client.deleted);
        this.clientMedias = results[1].filter(clientMedia => !clientMedia.deleted);
        this.clientPorts = results[2].filter(clientPort => !clientPort.deleted);

        this.clientMap = new Map(this.clients.map(c => [c.id, c]));
        this.clientMediaMap = new Map(this.clientMedias.map(cm => [cm.id, cm]));
        this.clientPortMap = new Map(this.clientPorts.map(cp => [cp.id, cp]));

        this.prepareDisplayColumns();

        this.query();
      });
    });
  }

  toISOStringWithTimezone(date: Date) {
    const tzo = date.getTimezoneOffset();
    const dif = tzo < 0 ? '+' : '-';
    const pad = function(num: number) {
      return (num < 10 ? '0' : '') + num;
    }

    return date.getFullYear() +
        '-' + pad(date.getMonth() + 1) +
        '-' + pad(date.getDate()) +
        'T' + pad(date.getHours()) +
        ':' + pad(date.getMinutes()) +
        ':' + pad(date.getSeconds()) +
        dif + pad(Math.floor(Math.abs(tzo) / 60)) +
        ':' + pad(Math.abs(tzo) % 60);
  }

  ngOnInit() {
    this.dataRequest$.pipe(
      debounceTime(500),
      switchMap(query => {
        const time = new Date();
        let timeStart = new Date(time);
        let timeEnd = new Date(time);

        if (this.range.controls.start.value && this.range.controls.end.value) {
          timeStart = new Date(Date.parse(this.range.controls.start.value.toString()));
          timeEnd = new Date(Date.parse(this.range.controls.end.value.toString()) + 86399999);
          if (timeEnd.getTime() > time.getTime()) {
            timeEnd = new Date(time);
          }
        }

        if (this.billInterval === 'day') {
          if (this.range.controls.start.value && this.range.controls.end.value) {
            this.billStart = new Date(timeStart);
            this.billEnd = new Date(timeEnd);
          } else {
            this.billEnd = new Date(time);
            time.setMilliseconds(0);
            time.setSeconds(0);
            time.setMinutes(0);
            time.setHours(0);
            time.setDate(time.getDate() - 30);
            this.billStart = new Date(time);
          }
        }
        if (this.billInterval === 'month') {
          if (this.range.controls.start.value && this.range.controls.end.value) {
            this.billStart = new Date(timeStart);
            this.billEnd = new Date(timeEnd);
          } else {
            this.billEnd = new Date(time);
            time.setMilliseconds(0);
            time.setSeconds(0);
            time.setMinutes(0);
            time.setHours(0);
            time.setMonth(time.getMonth() - 12);
            this.billStart = new Date(time);
          }
        }
        if (this.billInterval === 'year') {
          if (this.range.controls.start.value && this.range.controls.end.value) {
            this.billStart = new Date(timeStart);
            this.billEnd = new Date(timeEnd);
          } else {
            this.billEnd = new Date(time);
            time.setMilliseconds(0);
            time.setSeconds(0);
            time.setMinutes(0);
            time.setHours(0);
            time.setFullYear(time.getFullYear() - 3);
            this.billStart = new Date(time);
          }
        }

        return this.billAPI.getBillList(
          this.billInterval,
          this.toISOStringWithTimezone(this.billStart),
          this.toISOStringWithTimezone(this.billEnd),
          query
        ).pipe(
          catchError(() => {
            return scheduled([[]], asyncScheduler);
          })
        );
      }),
    ).subscribe(result => {
      this.billData = result;
      this.updateBillView();
    });

    this.formGroupQuery.valueChanges.subscribe(() => {
      this.query();
    });
  }

  ngAfterViewInit() {
    this.route.queryParams.subscribe(params => {
      if (params['directMode']) {
        this.mode.set(params['directMode'] === 'true' ? PartnerType.PARTNER_TYPE_DIRECT : PartnerType.PARTNER_TYPE_PROGRAMMATIC);
      } else {
        this.mode.set(PartnerType.PARTNER_TYPE_PROGRAMMATIC);
      }

      if (this.mode() === PartnerType.PARTNER_TYPE_DIRECT) {
        if (this.formGroupQuery.controls.mode.value.indexOf(String(PartnerType.PARTNER_TYPE_DIRECT)) < 0) {
          this.formGroupQuery.controls.mode.setValue([]);
        }
        this.filterMode = new Map([
          ['3', '直通模式'],
        ]);
      }
      if (this.mode() === PartnerType.PARTNER_TYPE_PROGRAMMATIC) {
        if (this.formGroupQuery.controls.mode.value.indexOf(String(PartnerType.PARTNER_TYPE_DIRECT)) >= 0) {
          this.formGroupQuery.controls.mode.setValue([]);
        }
        this.filterMode = new Map([
          ['1', '分成模式'],
          ['2', '竞价模式'],
        ]);
      }
    });
  }

  ngDoCheck(): void {
    const changes = this.differ.diff(this.range.getRawValue());
    if (changes) {
      if (this.range.controls.start.value && this.range.controls.end.value) {
        this.query();
      }
    }
  }

  get selectedClients(): Client[] {
    return this.formGroupQuery.controls.client.value;
  }

  get selectedClientMedias(): ClientMedia[] {
    return this.formGroupQuery.controls.clientMedia.value;
  }

  get selectedModes(): string[] {
    return this.formGroupQuery.controls.mode.value;
  }

  get searchValue(): string {
    return this.formGroupQuery.controls.search.value;
  }

  query() {
    this.formQuery = {
      filter: {
        clientMode: [String(this.mode())],
        vendorMode: [String(this.mode())],
        client: this.formGroupQuery.controls.client.value.map(client => client.id!.toString()),
        clientMedia: this.formGroupQuery.controls.clientMedia.value.map(clientMedia => clientMedia.id!.toString()),
        mode: this.formGroupQuery.controls.mode.value,
      },
      searchKey: ['name', 'tagId'],
      searchValue: this.formGroupQuery.controls.search.value,
    };

    this.dataRequest$.next(this.formQuery);
  }

  download() {
    const time = new Date();
    let timeStart = new Date(time);
    let timeEnd = new Date(time);

    if (this.range.controls.start.value && this.range.controls.end.value) {
      timeStart = new Date(Date.parse(this.range.controls.start.value.toString()));
      timeEnd = new Date(Date.parse(this.range.controls.end.value.toString()) + 86399999);
      if (timeEnd.getTime() > time.getTime()) {
        timeEnd = new Date(time);
      }
    }

    if (this.billInterval === 'day') {
      if (this.range.controls.start.value && this.range.controls.end.value) {
        this.billStart = new Date(timeStart);
        this.billEnd = new Date(timeEnd);
      } else {
        this.billEnd = new Date(time);
        time.setMilliseconds(0);
        time.setSeconds(0);
        time.setMinutes(0);
        time.setHours(0);
        time.setDate(time.getDate() - 30);
        this.billStart = new Date(time);
      }
    }
    if (this.billInterval === 'month') {
      if (this.range.controls.start.value && this.range.controls.end.value) {
        this.billStart = new Date(timeStart);
        this.billEnd = new Date(timeEnd);
      } else {
        this.billEnd = new Date(time);
        time.setMilliseconds(0);
        time.setSeconds(0);
        time.setMinutes(0);
        time.setHours(0);
        time.setMonth(time.getMonth() - 12);
        this.billStart = new Date(time);
      }
    }
    if (this.billInterval === 'year') {
      if (this.range.controls.start.value && this.range.controls.end.value) {
        this.billStart = new Date(timeStart);
        this.billEnd = new Date(timeEnd);
      } else {
        this.billEnd = new Date(time);
        time.setMilliseconds(0);
        time.setSeconds(0);
        time.setMinutes(0);
        time.setHours(0);
        time.setFullYear(time.getFullYear() - 3);
        this.billStart = new Date(time);
      }
    }

    this.billAPI.downloadBill(
      this.billInterval,
      this.billAggregateUpstream,
      this.toISOStringWithTimezone(this.billStart),
      this.toISOStringWithTimezone(this.billEnd),
      this.formQuery,
    ).subscribe(data => {
      const contentType = 'application/vnd.ms-excel';
      const blob = new Blob([data], { type: contentType });
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = 'bill-client.xlsx';
      a.click();

      window.URL.revokeObjectURL(url);
    });
  }

  clear(event: Event, field: keyof UpstreamObserverQueryControls, value: string | Client[] | ClientMedia[] | string[]) {
    event.stopPropagation();
    this.formGroupQuery.patchValue({[field]: value});
    this.query();
  }

  changeBillInterval(event: MatButtonToggleChange) {
    if (event.value !== this.billInterval) {
      this.billInterval = event.value;
      this.query();
    }
  }

  changeBillAggregateUpstream(event: MatButtonToggleChange) {
    if (event.value !== this.billAggregateUpstream) {
      this.billAggregateUpstream = event.value;
      this.prepareDisplayColumns();

      this.updateBillView();
    }
  }

  prepareDisplayColumns() {
    const displayedColumns = ['time'];
    this.displayedColumnsWidth = 120;
    if (this.billAggregateUpstream === 'client' || this.billAggregateUpstream === 'clientport') {
      displayedColumns.push('partner');
      // time column is 120px when partner column exists
      this.displayedColumnsWidth = this.displayedColumnsWidth + 250;
    }
    this.displayedColumns.set([...displayedColumns, 'cost', 'impression', 'click', 'request', 'response']);
    this.displayedColumnsWidth = this.displayedColumnsWidth + 5 * 120;

    this.onResize();
  }

  updateBillView() {
    this.minTimestamp = this.billEnd;
    this.maxTimestamp = this.billStart;
    this.billViewTotal = {
      time: '',
      start: new Date(),
      end: new Date(),
      client: 0,
      vendor: 0,
      clientMedia: 0,
      vendorMedia: 0,
      clientPort: 0,
      vendorPort: 0,
      request: null,
      response: null,
      impression: null,
      click: null,
      cost: null,
      status: BillStatus.BILL_STATUS_IGNORE,
      closed: 0,
      total: 0,
    };

    this.billViewData.length = 0;
    this.billViewMap.clear();
    for (const bill of this.billData) {
      if (this.minTimestamp > new Date(bill.date)) {
        this.minTimestamp = new Date(bill.date);
      }
      if (this.maxTimestamp < new Date(bill.date)) {
        this.maxTimestamp = new Date(bill.date);
      }

      let time = '';
      if (this.billInterval === 'day') {
        time = this.toISOStringWithTimezone(new Date(bill.date)).substring(0, 10).replace('T', ' ');
      }
      if (this.billInterval === 'month') {
        time = this.toISOStringWithTimezone(new Date(bill.date)).substring(0, 7).replace('T', ' ');
      }
      if (this.billInterval === 'year') {
        time = this.toISOStringWithTimezone(new Date(bill.date)).substring(0, 4).replace('T', ' ');
      }

      let key = time + '|';
      if (this.billAggregateUpstream === 'client' || this.billAggregateUpstream === 'clientport') {
        key += 'C' + this.clientPortMap.get(bill.clientPort)?.client.id + '|';
      }
      if (this.billAggregateUpstream === 'clientport') {
        key += 'CP' + bill.clientPort + '|';
      }

      if (!this.billViewMap.has(key)) {
        const billView: BillView = {
          time: time,
          start: new Date(bill.date),
          end: new Date(bill.date),
          client: this.billAggregateUpstream === 'client' || this.billAggregateUpstream === 'clientport' ? this.clientPortMap.get(bill.clientPort)?.client.id ?? 0 : 0,
          clientMedia: this.billAggregateUpstream === 'clientport' ? this.clientPortMap.get(bill.clientPort)?.clientMedia.id ?? 0 : 0,
          clientPort: this.billAggregateUpstream === 'clientport' ? bill.clientPort : 0,
          vendor: 0,
          vendorMedia: 0,
          vendorPort: 0,
          request: null,
          response: null,
          impression: null,
          click: null,
          cost: null,
          status: bill.status,
          closed: 0,
          total: 0,
        };

        this.billViewData.push(billView);
        this.billViewMap.set(key, billView);
      }

      const billView = this.billViewMap.get(key)!;
      if (billView.start > new Date(bill.date)) {
        billView.start = new Date(bill.date);
      }
      if (billView.end < new Date(bill.date)) {
        billView.end = new Date(bill.date);
      }

      if (bill.request !== null) {
        billView.request = (billView.request === null ? 0 : billView.request) + bill.request;
      }
      if (bill.response !== null) {
        billView.response = (billView.response === null ? 0 : billView.response) + bill.response;
      }
      if (bill.impression !== null) {
        billView.impression = (billView.impression === null ? 0 : billView.impression) + bill.impression;
      }
      if (bill.click !== null) {
        billView.click = (billView.click === null ? 0 : billView.click) + bill.click;
      }
      if (bill.cost !== null) {
        billView.cost = (billView.cost === null ? 0 : billView.cost) + bill.cost;
      }
      billView.closed++;
      billView.total++;

      if (bill.request !== null) {
          this.billViewTotal.request = (this.billViewTotal.request === null ? 0 : this.billViewTotal.request) + bill.request;
      }
      if (bill.response !== null) {
          this.billViewTotal.response = (this.billViewTotal.response === null ? 0 : this.billViewTotal.response) + bill.response;
      }
      if (bill.impression !== null) {
          this.billViewTotal.impression = (this.billViewTotal.impression === null ? 0 : this.billViewTotal.impression) + bill.impression;
      }
      if (bill.click !== null) {
          this.billViewTotal.click = (this.billViewTotal.click === null ? 0 : this.billViewTotal.click) + bill.click;
      }
      if (bill.cost !== null) {
          this.billViewTotal.cost = (this.billViewTotal.cost === null ? 0 : this.billViewTotal.cost) + bill.cost;
      }
    }

    const data = this.billViewData.sort((a, b) => {
      const keya = a.time + '|' + a.clientPort + '|' + a.vendorPort;
      const keyb = b.time + '|' + b.clientPort + '|' + b.vendorPort;
      return keya > keyb ? -1 : 1;
    });

    this.dataSource.set(this.createDataSource(data));
  }

  private createDataSource(data: BillView[]): MatTableDataSource<BillView> {
    const dataSource = new MatTableDataSource(data);
    dataSource.sort = this.sort() ?? null;
    dataSource.paginator = this.paginator() ?? null;
    dataSource.sortingDataAccessor = (item, property) => {
      switch (property) {
        case 'ctr': return item.impression ? (1.0 * (item.click ?? 0) / item.impression) : -1;
        case 'cpm': return item.impression ? (1.0 * (item.cost ?? 0) / 100 / item.impression) : -1;
        case 'client': return this.clientPortMap.get(item.clientPort)?.client.name ?? '';
        case 'clientport': return this.clientPortMap.get(item.clientPort)?.name ?? '';
        default: {
          const value = item[property as keyof typeof item];
          if (typeof value === 'number') {
            return value;
          } else {
            return value ? value.toString() : '';
          }
        }
      }
    };
    return dataSource;
  }

  onTableScroll(event: Event) {
    this.tableWidth = this.table()?.nativeElement.clientWidth ?? 0;
    if (this.displayedColumnsWidth > this.tableWidth) {
      this.scrollLeft = (event.target as HTMLElement).scrollLeft;
      this.scrollRight = (this.displayedColumnsWidth - this.tableWidth) - (event.target as HTMLElement).scrollLeft;
    }
  }

  @HostListener('window:resize')
  onResize() {
    this.tableWidth = this.table()?.nativeElement.clientWidth ?? 0;
    if (this.displayedColumnsWidth > this.tableWidth) {
      this.scrollRight = (this.displayedColumnsWidth - this.tableWidth) - this.scrollLeft;
    } else {
      this.scrollLeft = 0;
      this.scrollRight = 0;
    }
  }

}
