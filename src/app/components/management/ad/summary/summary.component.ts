import { AfterViewInit, ChangeDetectionStrategy, Component, DoCheck, effect, ElementRef, HostListener, inject, KeyValueDiffer, KeyValueDiffers, OnInit, signal, viewChild, WritableSignal } from '@angular/core';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { CdkMenuModule } from '@angular/cdk/menu';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleChange, MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute } from '@angular/router';
import { asyncScheduler, catchError, debounceTime, forkJoin, scheduled, Subject, switchMap } from 'rxjs';

import { BillAPI, BillStatus, BillView, Client, ClientAPI, ClientMedia, ClientMediaAPI, ClientPort, ClientPortAPI, ConnectionAPI, Medium, PartnerType, PerformanceAPI, PerformancePartner, PerformancePlaceholder, PerformanceView, Query, Sign, TimedPairedVendorPortMap, Vendor, VendorAPI, VendorMedia, VendorMediaAPI, VendorPort, VendorPortAPI } from '../../../../core';
import { TenantService } from '../../../../services';
import { AdEntityComponent, FilteredSelectClientComponent, FilteredSelectClientMediaComponent, FilteredSelectVendorComponent, FilteredSelectVendorMediaComponent } from '../../../../shared';
import { ClientPortDialogComponent, ClientPortDialogData } from '../clientport-dialog/clientport-dialog.component';
import { VendorPortDialogComponent, VendorPortDialogData } from '../vendorport-dialog/vendorport-dialog.component';

interface SummaryColumnControls {
  column: FormControl<string[]>;
}

interface SummaryQueryControls {
  client: FormControl<Client[]>;
  clientMedia: FormControl<ClientMedia[]>;
  vendor: FormControl<Vendor[]>;
  vendorMedia: FormControl<VendorMedia[]>;
  searchUpstream: FormControl<string>;
  searchDownstream: FormControl<string>;
}

interface SummaryRangeControls {
  start: FormControl<Date | null>;
  end: FormControl<Date | null>;
}

@Component({
  selector: 'carambola-summary',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginator,
    MatPaginatorModule,
    MatSelectModule,
    MatSnackBarModule,
    MatSort,
    MatSortModule,
    MatTableModule,
    MatTooltipModule,
    CdkMenuModule,
    FilteredSelectClientComponent,
    FilteredSelectClientMediaComponent,
    FilteredSelectVendorComponent,
    FilteredSelectVendorMediaComponent,
    AdEntityComponent,
  ],
  templateUrl: './summary.component.html',
  styleUrls: ['./summary.component.scss'],
  animations: [
    trigger('detailExpand', [
      state('collapsed, void', style({height: '0px', visibility: 'hidden'})),
      state('expanded', style({height: '*', visibility: 'visible'})),
      transition('expanded <=> collapsed, void <=> *', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ],
})
export class SummaryComponent implements OnInit, AfterViewInit, DoCheck {
  private formBuilder = inject(FormBuilder);
  private tenantService = inject(TenantService);
  private clientAPI = inject(ClientAPI);
  private clientMediaAPI = inject(ClientMediaAPI);
  private clientPortAPI = inject(ClientPortAPI);
  private vendorAPI = inject(VendorAPI);
  private vendorMediaAPI = inject(VendorMediaAPI);
  private vendorPortAPI = inject(VendorPortAPI);
  private performanceAPI = inject(PerformanceAPI);
  private billAPI = inject(BillAPI);
  private connectionAPI = inject(ConnectionAPI);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private route = inject(ActivatedRoute);
  private readonly differs = inject(KeyValueDiffers);

  PartnerType = PartnerType;
  BillStatus = BillStatus;

  displayedColumns = signal<string[]>([]);
  displayedColumnsWidth = 0;
  scrollLeft = 0;
  scrollRight = 0;
  tableWidth = 0;
  candidateColumns: Map<string, string> = new Map<string, string>();
  formGroupColumn: FormGroup<SummaryColumnControls>;

  clients: Client[] = [];
  vendors: Vendor[] = [];
  clientMedias: ClientMedia[] = [];
  vendorMedias: VendorMedia[] = [];
  clientPorts: ClientPort[] = [];
  vendorPorts: VendorPort[] = [];

  clientMap: Map<number | null, Client> = new Map<number | null, Client>();
  clientMediaMap: Map<number | null, ClientMedia> = new Map<number | null, ClientMedia>();
  clientPortMap: Map<number | null, ClientPort> = new Map<number | null, ClientPort>();
  vendorMap: Map<number | null, Vendor> = new Map<number | null, Vendor>();
  vendorMediaMap: Map<number | null, VendorMedia> = new Map<number | null, VendorMedia>();
  vendorPortMap: Map<number | null, VendorPort> = new Map<number | null, VendorPort>();

  mode: WritableSignal<PartnerType> = signal(PartnerType.PARTNER_TYPE_UNKNOWN);
  formGroupQuery: FormGroup<SummaryQueryControls>;
  formQueryUpstream: Query<PerformancePlaceholder> = {
    filter: {},
    searchKey: ['name', 'tagId'],
    searchValue: '',
  };
  formQueryDownstream: Query<PerformancePlaceholder> = {
    filter: {},
    searchKey: ['name', 'tagId'],
    searchValue: '',
  };
  range: FormGroup<SummaryRangeControls>;
  differ: KeyValueDiffer<string, unknown>;

  summaryAggregateUpstream = 'all';
  summaryAggregateDownstream = 'all';
  summaryInterval = 'day';
  summaryStart = new Date();
  summaryEnd = new Date();

  timestamps: Date[] = [];
  minTimestamp: Date = new Date();
  maxTimestamp: Date = new Date();
  performanceData: PerformancePartner[] = [];
  performanceViewData: PerformanceView[] = [];
  performanceViewMap: Map<string, PerformanceView> = new Map<string, PerformanceView>();
  mediumData: Medium[] = [];
  mediumViewData: BillView[] = [];
  mediumViewMap: Map<string, BillView> = new Map<string, BillView>();
  mediumUpstreamData: Medium[] = [];
  mediumUpstreamMap: Map<string, Medium> = new Map<string, Medium>();
  mediumTransitionData: Medium[] = [];
  mediumTransitionMap: Map<string, Medium> = new Map<string, Medium>();
  mediumDownstreamData: Medium[] = [];
  mediumDownstreamMap: Map<string, Medium> = new Map<string, Medium>();
  signData: Sign[] = [];
  signMap: Map<string, Sign> = new Map<string, Sign>();
  signViewData: BillView[] = [];
  signViewMap: Map<string, BillView> = new Map<string, BillView>();
  connectionData: TimedPairedVendorPortMap = {};

  performanceViewTotal: PerformanceView = {
    time: '',
    start: new Date(),
    end: new Date(),
    client: 0,
    vendor: 0,
    clientMedia: 0,
    vendorMedia: 0,
    clientPort: 0,
    vendorPort: 0,
    request: 0,
    requestv: 0,
    response: 0,
    responsev: 0,
    impression: 0,
    click: 0,
    income: 0,
    outcomeUpstream: 0,
    outcomeRebate: 0,
    outcomeDownstream: 0,
    offer: 0,
  };
  mediumViewTotal: PerformanceView = {
    time: '',
    start: new Date(),
    end: new Date(),
    client: 0,
    vendor: 0,
    clientMedia: 0,
    vendorMedia: 0,
    clientPort: 0,
    vendorPort: 0,
    request: 0,
    requestv: 0,
    response: 0,
    responsev: 0,
    impression: 0,
    click: 0,
    income: 0,
    outcomeUpstream: 0,
    outcomeRebate: 0,
    outcomeDownstream: 0,
    offer: 0,
  };
  signViewTotal: PerformanceView = {
    time: '',
    start: new Date(),
    end: new Date(),
    client: 0,
    vendor: 0,
    clientMedia: 0,
    vendorMedia: 0,
    clientPort: 0,
    vendorPort: 0,
    request: 0,
    requestv: 0,
    response: 0,
    responsev: 0,
    impression: 0,
    click: 0,
    income: 0,
    outcomeUpstream: 0,
    outcomeRebate: 0,
    outcomeDownstream: 0,
    offer: 0,
  };

  readonly sort = viewChild(MatSort);
  readonly paginator = viewChild(MatPaginator);
  readonly table = viewChild<ElementRef>('table');

  dataRequest$ = new Subject<[Query<PerformancePlaceholder>, Query<PerformancePlaceholder>]>();
  dataSource = signal(this.createDataSource([]));

  constructor() {
    this.formGroupColumn = this.formBuilder.group({
      column: this.formBuilder.nonNullable.control<string[]>([]),
    });
    this.formGroupQuery = this.formBuilder.group({
      client: this.formBuilder.nonNullable.control<Client[]>([]),
      clientMedia: this.formBuilder.nonNullable.control<ClientMedia[]>([]),
      vendor: this.formBuilder.nonNullable.control<Vendor[]>([]),
      vendorMedia: this.formBuilder.nonNullable.control<VendorMedia[]>([]),
      searchUpstream: this.formBuilder.nonNullable.control(''),
      searchDownstream: this.formBuilder.nonNullable.control(''),
    });

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
      this.performanceViewTotal = {
        time: '',
        start: new Date(),
        end: new Date(),
        client: 0,
        vendor: 0,
        clientMedia: 0,
        vendorMedia: 0,
        clientPort: 0,
        vendorPort: 0,
        request: 0,
        requestv: 0,
        response: 0,
        responsev: 0,
        impression: 0,
        click: 0,
        income: 0,
        outcomeUpstream: 0,
        outcomeRebate: 0,
        outcomeDownstream: 0,
        offer: 0,
      };
      this.mediumViewTotal = {
        time: '',
        start: new Date(),
        end: new Date(),
        client: 0,
        vendor: 0,
        clientMedia: 0,
        vendorMedia: 0,
        clientPort: 0,
        vendorPort: 0,
        request: 0,
        requestv: 0,
        response: 0,
        responsev: 0,
        impression: 0,
        click: 0,
        income: 0,
        outcomeUpstream: 0,
        outcomeRebate: 0,
        outcomeDownstream: 0,
        offer: 0,
      };
      this.signViewTotal = {
        time: '',
        start: new Date(),
        end: new Date(),
        client: 0,
        vendor: 0,
        clientMedia: 0,
        vendorMedia: 0,
        clientPort: 0,
        vendorPort: 0,
        request: 0,
        requestv: 0,
        response: 0,
        responsev: 0,
        impression: 0,
        click: 0,
        income: 0,
        outcomeUpstream: 0,
        outcomeRebate: 0,
        outcomeDownstream: 0,
        offer: 0,
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
        this.vendorAPI.getVendorList({
          filter: {
            mode: [String(mode)],
          },
          searchKey: [],
          searchValue: '',
        }),
        this.vendorMediaAPI.getVendorMediaList({
          filter: {
            vendorMode: [String(mode)],
          },
          searchKey: [],
          searchValue: '',
        }),
        this.vendorPortAPI.getVendorPortList({
          filter: {
            vendorMode: [String(mode)],
          },
          searchKey: [],
          searchValue: '',
        }),
      ]).subscribe(results => {
        this.clients = results[0].filter(client => !client.deleted);
        this.clientMedias = results[1].filter(clientMedia => !clientMedia.deleted);
        this.clientPorts = results[2].filter(clientPort => !clientPort.deleted);
        this.vendors = results[3].filter(vendor => !vendor.deleted);
        this.vendorMedias = results[4].filter(vendorMedia => !vendorMedia.deleted);
        this.vendorPorts = results[5].filter(vendorPort => !vendorPort.deleted);

        this.clientMap = new Map(this.clients.map(c => [c.id, c]));
        this.clientMediaMap = new Map(this.clientMedias.map(cm => [cm.id, cm]));
        this.clientPortMap = new Map(this.clientPorts.map(cp => [cp.id, cp]));
        this.vendorMap = new Map(this.vendors.map(v => [v.id, v]));
        this.vendorMediaMap = new Map(this.vendorMedias.map(vm => [vm.id, vm]));
        this.vendorPortMap = new Map(this.vendorPorts.map(vp => [vp.id, vp]));

        this.candidateColumns = new Map([]);
        this.candidateColumns.set('cost', '预估收益');
        this.candidateColumns.set('impression', '展现');
        this.candidateColumns.set('click', '点击');
        this.candidateColumns.set('ctr', '点击率');
        this.candidateColumns.set('ecpm', 'eCPM');
        this.candidateColumns.set('request', '请求');
        this.candidateColumns.set('response', '响应');
        this.candidateColumns.set('gfr', '填充率');
        this.candidateColumns.set('gfrv', '有效填充率');
        this.candidateColumns.set('er', '展现率');
        this.candidateColumns.set('rv', '请求价值');
        this.candidateColumns.set('profit', '利润');
        this.formGroupColumn.patchValue({
          column: [...this.candidateColumns.keys()],
        });

        this.prepareDisplayColumns();

        this.query();
      });
    });
  }

  get selectedColumns(): string[] {
    return this.formGroupColumn.controls.column.value;
  }

  get selectedClients(): Client[] {
    return this.formGroupQuery.controls.client.value;
  }

  get selectedClientMedias(): ClientMedia[] {
    return this.formGroupQuery.controls.clientMedia.value;
  }

  get selectedVendors(): Vendor[] {
    return this.formGroupQuery.controls.vendor.value;
  }

  get selectedVendorMedias(): VendorMedia[] {
    return this.formGroupQuery.controls.vendorMedia.value;
  }

  get searchUpstreamValue(): string {
    return this.formGroupQuery.controls.searchUpstream.value;
  }

  get searchDownstreamValue(): string {
    return this.formGroupQuery.controls.searchDownstream.value;
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
      switchMap(([queryUpstream, queryDownstream]) => {
        const time = new Date();
        let timeStart = new Date(time);
        let timeEnd = new Date(time);
        const start = this.range.controls.start.value;
        const end = this.range.controls.end.value;

        if (start && end) {
          timeStart = new Date(Date.parse(String(start)));
          timeEnd = new Date(Date.parse(String(end)) + 86399999);
          if (timeEnd.getTime() > time.getTime()) {
            timeEnd = new Date(time);
          }
        }

        if (this.summaryInterval === 'day') {
          if (start && end) {
            this.summaryStart = new Date(timeStart);
            this.summaryEnd = new Date(timeEnd);
          } else {
            this.summaryEnd = new Date(time);
            time.setMilliseconds(0);
            time.setSeconds(0);
            time.setMinutes(0);
            time.setHours(0);
            time.setDate(time.getDate() - 30);
            this.summaryStart = new Date(time);
          }
        }
        if (this.summaryInterval === 'month') {
          if (start && end) {
            this.summaryStart = new Date(timeStart);
            this.summaryEnd = new Date(timeEnd);
          } else {
            this.summaryEnd = new Date(time);
            time.setMilliseconds(0);
            time.setSeconds(0);
            time.setMinutes(0);
            time.setHours(0);
            time.setMonth(time.getMonth() - 12);
            this.summaryStart = new Date(time);
          }
        }
        if (this.summaryInterval === 'year') {
          if (start && end) {
            this.summaryStart = new Date(timeStart);
            this.summaryEnd = new Date(timeEnd);
          } else {
            this.summaryEnd = new Date(time);
            time.setMilliseconds(0);
            time.setSeconds(0);
            time.setMinutes(0);
            time.setHours(0);
            time.setFullYear(time.getFullYear() - 3);
            this.summaryStart = new Date(time);
          }
        }

        return forkJoin([
          this.performanceAPI.getPerformanceClientList(
            this.summaryInterval,
            true,
            this.toISOStringWithTimezone(this.summaryStart),
            this.toISOStringWithTimezone(this.summaryEnd),
            queryUpstream
          ),
          this.billAPI.getMediumListClient(
            this.summaryInterval,
            this.toISOStringWithTimezone(this.summaryStart),
            this.toISOStringWithTimezone(this.summaryEnd),
            queryUpstream
          ),
          this.billAPI.getSignList(
            this.summaryInterval,
            this.toISOStringWithTimezone(this.summaryStart),
            this.toISOStringWithTimezone(this.summaryEnd),
            queryDownstream
          ),
          this.connectionAPI.getPairedClientPortMap(
            this.toISOStringWithTimezone(this.summaryStart),
            this.toISOStringWithTimezone(this.summaryEnd),
            queryDownstream
          ),
        ]).pipe(
          catchError(() => {
            return scheduled([[], [], [], []], asyncScheduler);
          })
        );
      }),
    ).subscribe(results => {
      this.performanceData = results[0];
      this.mediumData = results[1];
      this.signData = results[2];
      this.connectionData = results[3];
      this.prepareTimestampList();
      this.updateSummaryView();
    });

    this.formGroupColumn.valueChanges.subscribe(() => {
      this.prepareDisplayColumns();
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

  query() {
    this.formQueryUpstream = {
      filter: {
        clientMode: [String(this.mode())],
        vendorMode: [String(this.mode())],
        client: this.selectedClients.map(client => client.id!.toString()),
        clientMedia: this.selectedClientMedias.map(clientMedia => clientMedia.id!.toString()),
      },
      searchKey: ['name', 'tagId'],
      searchValue: this.searchUpstreamValue,
    };
    this.formQueryDownstream = {
      filter: {
        clientMode: [String(this.mode())],
        vendorMode: [String(this.mode())],
        vendor: this.selectedVendors.map(vendor => vendor.id!.toString()),
        vendorMedia: this.selectedVendorMedias.map(clientMedia => clientMedia.id!.toString()),
      },
      searchKey: ['name', 'tagId'],
      searchValue: this.searchDownstreamValue,
    };

    this.dataRequest$.next([this.formQueryUpstream, this.formQueryDownstream]);
  }

  download() {
    const time = new Date();
    let timeStart = new Date(time);
    let timeEnd = new Date(time);
    const start = this.range.controls.start.value;
    const end = this.range.controls.end.value;

    if (start && end) {
      timeStart = new Date(Date.parse(String(start)));
      timeEnd = new Date(Date.parse(String(end)) + 86399999);
      if (timeEnd.getTime() > time.getTime()) {
        timeEnd = new Date(time);
      }
    }

    if (this.summaryInterval === 'day') {
      if (start && end) {
        this.summaryStart = new Date(timeStart);
        this.summaryEnd = new Date(timeEnd);
      } else {
        this.summaryEnd = new Date(time);
        time.setMilliseconds(0);
        time.setSeconds(0);
        time.setMinutes(0);
        time.setHours(0);
        time.setDate(time.getDate() - 30);
        this.summaryStart = new Date(time);
      }
    }
    if (this.summaryInterval === 'month') {
      if (start && end) {
        this.summaryStart = new Date(timeStart);
        this.summaryEnd = new Date(timeEnd);
      } else {
        this.summaryEnd = new Date(time);
        time.setMilliseconds(0);
        time.setSeconds(0);
        time.setMinutes(0);
        time.setHours(0);
        time.setMonth(time.getMonth() - 12);
        this.summaryStart = new Date(time);
      }
    }
    if (this.summaryInterval === 'year') {
      if (start && end) {
        this.summaryStart = new Date(timeStart);
        this.summaryEnd = new Date(timeEnd);
      } else {
        this.summaryEnd = new Date(time);
        time.setMilliseconds(0);
        time.setSeconds(0);
        time.setMinutes(0);
        time.setHours(0);
        time.setFullYear(time.getFullYear() - 3);
        this.summaryStart = new Date(time);
      }
    }

    this.billAPI.downloadSummary(
      this.summaryInterval,
      this.summaryAggregateUpstream,
      this.summaryAggregateDownstream,
      this.toISOStringWithTimezone(this.summaryStart),
      this.toISOStringWithTimezone(this.summaryEnd),
      this.formQueryUpstream,
      this.formQueryDownstream,
    ).subscribe(data => {
      const contentType = 'application/vnd.ms-excel';
      const blob = new Blob([data], { type: contentType });
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = 'summary.xlsx';
      a.click();

      window.URL.revokeObjectURL(url);
    });
  }

  uploadBill(target: EventTarget | null) {
    const files: FileList | null = (target as HTMLInputElement).files;

    if (files === null || files?.length === 0) {
      return;
    }

    const file: File | null = files.item(0);
    if (file === null) {
      return;
    }

    this.billAPI.uploadBill(file).subscribe(data => {
      if (data.uploaded > 0) {
        this.snackBar.open('成功上传' + data.uploaded + '条记录', undefined, {
          duration: 3000,
        });

        this.query();
      } else {
        this.snackBar.open('没有读取到有效的数据', undefined, {
          duration: 3000,
        });
      }
    });
  }

  downloadBill() {
    const time = new Date();
    let timeStart = new Date(time);
    let timeEnd = new Date(time);
    const start = this.range.controls.start.value;
    const end = this.range.controls.end.value;

    if (start && end) {
      timeStart = new Date(Date.parse(String(start)));
      timeEnd = new Date(Date.parse(String(end)) + 86399999);
      if (timeEnd.getTime() > time.getTime()) {
        timeEnd = new Date(time);
      }
    }

    if (this.summaryInterval === 'day') {
      if (start && end) {
        this.summaryStart = new Date(timeStart);
        this.summaryEnd = new Date(timeEnd);
      } else {
        this.summaryEnd = new Date(time);
        time.setMilliseconds(0);
        time.setSeconds(0);
        time.setMinutes(0);
        time.setHours(0);
        time.setDate(time.getDate() - 30);
        this.summaryStart = new Date(time);
      }
    }
    if (this.summaryInterval === 'month') {
      if (start && end) {
        this.summaryStart = new Date(timeStart);
        this.summaryEnd = new Date(timeEnd);
      } else {
        this.summaryEnd = new Date(time);
        time.setMilliseconds(0);
        time.setSeconds(0);
        time.setMinutes(0);
        time.setHours(0);
        time.setMonth(time.getMonth() - 12);
        this.summaryStart = new Date(time);
      }
    }
    if (this.summaryInterval === 'year') {
      if (start && end) {
        this.summaryStart = new Date(timeStart);
        this.summaryEnd = new Date(timeEnd);
      } else {
        this.summaryEnd = new Date(time);
        time.setMilliseconds(0);
        time.setSeconds(0);
        time.setMinutes(0);
        time.setHours(0);
        time.setFullYear(time.getFullYear() - 3);
        this.summaryStart = new Date(time);
      }
    }

    this.billAPI.downloadBill(
      this.summaryInterval,
      this.summaryAggregateUpstream,
      this.toISOStringWithTimezone(this.summaryStart),
      this.toISOStringWithTimezone(this.summaryEnd),
      this.formQueryUpstream,
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

  uploadSign(target: EventTarget | null) {
    const files: FileList | null = (target as HTMLInputElement).files;

    if (files === null || files?.length === 0) {
      return;
    }

    const file: File | null = files.item(0);
    if (file === null) {
      return;
    }

    this.billAPI.uploadSign(file).subscribe(data => {
      if (data.uploaded > 0) {
        this.snackBar.open('成功上传' + data.uploaded + '条记录', undefined, {
          duration: 3000,
        });

        this.query();
      } else {
        this.snackBar.open('没有读取到有效的数据', undefined, {
          duration: 3000,
        });
      }
    });
  }

  downloadSign() {
    const time = new Date();
    let timeStart = new Date(time);
    let timeEnd = new Date(time);
    const start = this.range.controls.start.value;
    const end = this.range.controls.end.value;

    if (start && end) {
      timeStart = new Date(Date.parse(String(start)));
      timeEnd = new Date(Date.parse(String(end)) + 86399999);
      if (timeEnd.getTime() > time.getTime()) {
        timeEnd = new Date(time);
      }
    }

    if (this.summaryInterval === 'day') {
      if (start && end) {
        this.summaryStart = new Date(timeStart);
        this.summaryEnd = new Date(timeEnd);
      } else {
        this.summaryEnd = new Date(time);
        time.setMilliseconds(0);
        time.setSeconds(0);
        time.setMinutes(0);
        time.setHours(0);
        time.setDate(time.getDate() - 30);
        this.summaryStart = new Date(time);
      }
    }
    if (this.summaryInterval === 'month') {
      if (start && end) {
        this.summaryStart = new Date(timeStart);
        this.summaryEnd = new Date(timeEnd);
      } else {
        this.summaryEnd = new Date(time);
        time.setMilliseconds(0);
        time.setSeconds(0);
        time.setMinutes(0);
        time.setHours(0);
        time.setMonth(time.getMonth() - 12);
        this.summaryStart = new Date(time);
      }
    }
    if (this.summaryInterval === 'year') {
      if (start && end) {
        this.summaryStart = new Date(timeStart);
        this.summaryEnd = new Date(timeEnd);
      } else {
        this.summaryEnd = new Date(time);
        time.setMilliseconds(0);
        time.setSeconds(0);
        time.setMinutes(0);
        time.setHours(0);
        time.setFullYear(time.getFullYear() - 3);
        this.summaryStart = new Date(time);
      }
    }

    this.billAPI.downloadSign(
      this.summaryInterval,
      this.summaryAggregateDownstream,
      this.toISOStringWithTimezone(this.summaryStart),
      this.toISOStringWithTimezone(this.summaryEnd),
      this.formQueryDownstream,
    ).subscribe(data => {
      const contentType = 'application/vnd.ms-excel';
      const blob = new Blob([data], { type: contentType });
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = 'sign-vendor.xlsx';
      a.click();

      window.URL.revokeObjectURL(url);
    });
  }

  downloadTemplate() {
    const a = document.createElement('a');
    a.href = '/template.xlsx';
    a.download = 'template.xlsx';
    a.click();
  }

  clear(
    event: Event,
    field: keyof SummaryQueryControls,
    value: string | Client[] | ClientMedia[] | Vendor[] | VendorMedia[]
  ) {
    event.stopPropagation();
    this.formGroupQuery.patchValue({[field]: value});
    this.query();
  }

  changeSummaryInterval(event: MatButtonToggleChange) {
    if (event.value !== this.summaryInterval) {
      this.summaryInterval = event.value;
      this.query();
    }
  }

  changeSummaryAggregateUpstream(event: MatButtonToggleChange) {
    if (event.value !== this.summaryAggregateUpstream) {
      this.summaryAggregateUpstream = event.value;
      if (this.mode() === PartnerType.PARTNER_TYPE_DIRECT) {
        if (this.summaryAggregateUpstream === 'all') {
          this.summaryAggregateDownstream = 'all';
        }
        if (this.summaryAggregateUpstream === 'client') {
          this.summaryAggregateDownstream = 'vendor';
        }
        if (this.summaryAggregateUpstream === 'clientport') {
          this.summaryAggregateDownstream = 'vendorport';
        }
      }
      this.prepareDisplayColumns();
      this.updateSummaryView();
    }
  }

  changeSummaryAggregateDownstream(event: MatButtonToggleChange) {
    if (event.value !== this.summaryAggregateDownstream) {
      this.summaryAggregateDownstream = event.value;
      if (this.mode() === PartnerType.PARTNER_TYPE_DIRECT) {
        if (this.summaryAggregateDownstream === 'all') {
          this.summaryAggregateUpstream = 'all';
        }
        if (this.summaryAggregateDownstream === 'vendor') {
          this.summaryAggregateUpstream = 'client';
        }
        if (this.summaryAggregateDownstream === 'vendorport') {
          this.summaryAggregateUpstream = 'clientport';
        }
      }
      this.prepareDisplayColumns();
      this.updateSummaryView();
    }
  }

  prepareDisplayColumns() {
    let displayedColumns = ['time'];
    this.displayedColumnsWidth = 120;
    if (this.summaryAggregateUpstream === 'client' || this.summaryAggregateUpstream === 'clientport') {
      displayedColumns = displayedColumns.concat(['upstream']);
      this.displayedColumnsWidth += 250;
    }
    if (this.summaryAggregateDownstream === 'vendor' || this.summaryAggregateDownstream === 'vendorport') {
      displayedColumns = displayedColumns.concat(['downstream']);
      this.displayedColumnsWidth += 250;
    }
    this.displayedColumns.set([...displayedColumns, ...this.selectedColumns]);
    this.displayedColumnsWidth = this.displayedColumnsWidth + this.selectedColumns.length * 120 + 80;

    this.onResize();
  }

  prepareTimestampList() {
    this.timestamps = [];

    for (let t = this.summaryEnd.getTime(); t >= this.summaryStart.getTime();) {
      const date = new Date(t);
      if (this.summaryInterval === 'day') {
        date.setMilliseconds(0);
        date.setSeconds(0);
        date.setMinutes(0);
        date.setHours(0);
      }
      if (this.summaryInterval === 'month') {
        date.setMilliseconds(0);
        date.setSeconds(0);
        date.setMinutes(0);
        date.setHours(0);
        date.setDate(1);
      }
      if (this.summaryInterval === 'year') {
        date.setMilliseconds(0);
        date.setSeconds(0);
        date.setMinutes(0);
        date.setHours(0);
        date.setDate(1);
        date.setMonth(0);
      }

      this.timestamps.push(date);
      t = date.getTime();

      if (this.summaryInterval === 'day') {
        t = t - 86400000;
      }
      if (this.summaryInterval === 'month') {
        const date = new Date(t);
        date.setMonth(date.getMonth() - 1);
        t = date.getTime();
      }
      if (this.summaryInterval === 'year') {
        const date = new Date(t);
        date.setFullYear(date.getFullYear() - 1);
        t = date.getTime();
      }
    }
  }

  updateSummaryView() {
    this.minTimestamp = this.summaryEnd;
    this.maxTimestamp = this.summaryStart;
    this.performanceViewTotal = {
      time: '',
      start: new Date(),
      end: new Date(),
      client: 0,
      vendor: 0,
      clientMedia: 0,
      vendorMedia: 0,
      clientPort: 0,
      vendorPort: 0,
      request: 0,
      requestv: 0,
      response: 0,
      responsev: 0,
      impression: 0,
      click: 0,
      income: 0,
      outcomeUpstream: 0,
      outcomeRebate: 0,
      outcomeDownstream: 0,
      offer: 0,
    };
    this.mediumViewTotal = {
      time: '',
      start: new Date(),
      end: new Date(),
      client: 0,
      vendor: 0,
      clientMedia: 0,
      vendorMedia: 0,
      clientPort: 0,
      vendorPort: 0,
      request: 0,
      requestv: 0,
      response: 0,
      responsev: 0,
      impression: 0,
      click: 0,
      income: 0,
      outcomeUpstream: 0,
      outcomeRebate: 0,
      outcomeDownstream: 0,
      offer: 0,
    };
    this.signViewTotal = {
      time: '',
      start: new Date(),
      end: new Date(),
      client: 0,
      vendor: 0,
      clientMedia: 0,
      vendorMedia: 0,
      clientPort: 0,
      vendorPort: 0,
      request: 0,
      requestv: 0,
      response: 0,
      responsev: 0,
      impression: 0,
      click: 0,
      income: 0,
      outcomeUpstream: 0,
      outcomeRebate: 0,
      outcomeDownstream: 0,
      offer: 0,
    };

    const pairedPortKeySet: Set<string> = new Set<string>();
    for (const dateKey of Object.keys(this.connectionData)) {
      const date = parseInt(dateKey);
      const clientPortList = this.connectionData[date];
      for (const clientPortKey of Object.keys(clientPortList)) {
        const clientPort = parseInt(clientPortKey);
        const pairedVendorPortList = clientPortList[clientPort];
        for (const vendorPortKey of Object.keys(pairedVendorPortList)) {
          const vendorPort = parseInt(vendorPortKey);
          const key = dateKey + '|' + clientPort + '|' + vendorPort;
          pairedPortKeySet.add(key);
        }
      }
    }

    this.performanceViewData.length = 0;
    this.performanceViewMap.clear();
    for (const performance of this.performanceData) {
      const time = this.toISOStringWithTimezone(new Date(performance.time)).substring(0, 10).replace('T', ' ');
      const key = time + '|' + performance.clientPort + '|' + performance.vendorPort;

      const performanceView: PerformanceView = {
        time: time,
        start: new Date(performance.time),
        end: new Date(performance.time),
        client: this.clientPortMap.get(performance.clientPort)?.client.id ?? 0,
        clientMedia: this.clientPortMap.get(performance.clientPort)?.clientMedia.id ?? 0,
        clientPort: performance.clientPort,
        vendor: this.vendorPortMap.get(performance.vendorPort)?.vendor.id ?? 0,
        vendorMedia: this.vendorPortMap.get(performance.vendorPort)?.vendorMedia.id ?? 0,
        vendorPort: performance.vendorPort,
        request: 0,
        requestv: 0,
        response: 0,
        responsev: 0,
        impression: 0,
        click: 0,
        income: 0,
        outcomeUpstream: 0,
        outcomeRebate: 0,
        outcomeDownstream: 0,
        offer: 0,
      };

      performanceView.request +=
        performance.eventA + performance.eventB + performance.eventC + performance.eventD + performance.eventE +
        performance.eventF + performance.eventG + performance.eventH + performance.eventK + performance.eventL +
        performance.eventM + performance.eventN + performance.eventO + performance.eventP;
      performanceView.requestv +=
        performance.eventC + performance.eventD + performance.eventE + performance.eventF + performance.eventK +
        performance.eventO;
      performanceView.response +=
        performance.eventD + performance.eventE + performance.eventK;
      performanceView.responsev +=
        performance.eventD + performance.eventE;
      performanceView.impression += performance.impression;
      performanceView.click += performance.click;
      performanceView.income += performance.income;
      performanceView.outcomeUpstream += performance.outcomeUpstream;
      performanceView.outcomeRebate += performance.outcomeRebate;
      performanceView.outcomeDownstream += performance.outcomeDownstream;

      this.performanceViewData.push(performanceView);
      this.performanceViewMap.set(key, performanceView);
    }

    this.signMap.clear();
    for (const sign of this.signData) {
      const time = this.toISOStringWithTimezone(new Date(sign.date)).substring(0, 10).replace('T', ' ');
      const key = time + '|' + sign.vendorPort;

      this.signMap.set(key, sign);
    }

    this.mediumUpstreamData.length = 0;
    this.mediumUpstreamMap.clear();
    for (const medium of this.mediumData) {
      const time = this.toISOStringWithTimezone(new Date(medium.date)).substring(0, 10).replace('T', ' ');
      const key = time + '|' + medium.clientPort + '|' + medium.vendorPort;

      this.mediumUpstreamData.push(medium);
      this.mediumUpstreamMap.set(key, medium);

      if (!this.performanceViewMap.has(key)) {
        if (medium.request === null) {
          medium.request = 0;
        }
        if (medium.response === null) {
          medium.response = 0;
        }
        if (medium.impression === null) {
          medium.impression = 0;
        }
        if (medium.click === null) {
          medium.click = 0;
        }
        if (medium.income === null) {
          medium.income = 0;
        }
        if (medium.outcomeUpstream === null) {
          medium.outcomeUpstream = 0;
        }
        if (medium.outcomeRebate === null) {
          medium.outcomeRebate = 0;
        }
        if (medium.outcomeDownstream === null) {
          medium.outcomeDownstream = 0;
        }
      } else {
        const performanceClientView = this.performanceViewMap.get(key)!;

        if (medium.request === null) {
            medium.request = performanceClientView.request;
        }
        if (medium.response === null) {
            medium.response = performanceClientView.response;
        }
        if (medium.impression === null) {
            medium.impression = performanceClientView.impression;
        }
        if (medium.click === null) {
            medium.click = performanceClientView.click;
        }
        if (medium.income === null) {
            medium.income = performanceClientView.income;
        }
        if (medium.outcomeUpstream === null) {
            medium.outcomeUpstream = performanceClientView.outcomeUpstream;
        }
        if (medium.outcomeRebate === null) {
            medium.outcomeRebate = performanceClientView.outcomeRebate;
        }
        if (medium.outcomeDownstream === null) {
            medium.outcomeDownstream = performanceClientView.outcomeDownstream;
        }
      }

      pairedPortKeySet.delete(time + '|' + medium.clientPort + '|' + medium.vendorPort);
    }

    for (const key of pairedPortKeySet) {
        const time = key.split('|')[0];
        const clientPortId = key.split('|')[1];
        const vendorPortId = key.split('|')[2];

        if (!this.performanceViewMap.has(key)) {
            continue;
        }
        const performanceView = this.performanceViewMap.get(key)!;

        if (!this.mediumUpstreamMap.has(key)) {
          const mediumUpstream: Medium = {
            date: time,
            clientPort: parseInt(clientPortId),
            vendorPort: parseInt(vendorPortId),
            request: performanceView.request,
            response: performanceView.response,
            impression: performanceView.impression,
            click: performanceView.click,
            income: performanceView.income,
            outcomeUpstream: performanceView.outcomeUpstream,
            outcomeRebate: performanceView.outcomeRebate,
            outcomeDownstream: performanceView.outcomeDownstream,
          }

          this.mediumUpstreamData.push(mediumUpstream);
          this.mediumUpstreamMap.set(key, mediumUpstream);
        }
    }

    this.mediumTransitionData = [];
    this.mediumTransitionMap.clear();
    for (const medium of this.mediumUpstreamData) {
      const time = this.toISOStringWithTimezone(new Date(medium.date)).substring(0, 10).replace('T', ' ');
      const key = time + '|' + medium.vendorPort

      if (!this.mediumTransitionMap.has(key)) {
        const mediumTransition: Medium = {
          date: time,
          clientPort: 0,
          vendorPort: medium.vendorPort,
          request: 0,
          response: 0,
          impression: 0,
          click: 0,
          income: 0,
          outcomeUpstream: 0,
          outcomeRebate: 0,
          outcomeDownstream: 0,
        };

        this.mediumTransitionData.push(mediumTransition);
        this.mediumTransitionMap.set(key, mediumTransition);
      }

      const mediumTransition = this.mediumTransitionMap.get(key)!
      mediumTransition.request = mediumTransition.request! + medium.request!;
      mediumTransition.response = mediumTransition.response! + medium.response!;
      mediumTransition.impression = mediumTransition.impression! + medium.impression!;
      mediumTransition.click = mediumTransition.click! + medium.click!;
      mediumTransition.income = mediumTransition.income! + medium.income!;
      mediumTransition.outcomeUpstream = mediumTransition.outcomeUpstream! + medium.outcomeUpstream!;
      mediumTransition.outcomeRebate = mediumTransition.outcomeRebate! + medium.outcomeRebate!;
      mediumTransition.outcomeDownstream = mediumTransition.outcomeDownstream! + medium.outcomeDownstream!;
    }

    for (const key of pairedPortKeySet) {
        const time = key.split('|')[0];
        const vendorPortId = key.split('|')[2];

        if (!this.performanceViewMap.has(key)) {
            continue;
        }
        const performanceView = this.performanceViewMap.get(key)!;

        if (!this.mediumUpstreamMap.has(key)) {
          const mediumUpstream: Medium = {
            date: time,
            clientPort: 0,
            vendorPort: parseInt(vendorPortId),
            request: performanceView.request,
            response: performanceView.response,
            impression: performanceView.impression,
            click: performanceView.click,
            income: performanceView.income,
            outcomeUpstream: performanceView.outcomeUpstream,
            outcomeRebate: performanceView.outcomeRebate,
            outcomeDownstream: performanceView.outcomeDownstream,
          }

          this.mediumUpstreamData.push(mediumUpstream);
          this.mediumUpstreamMap.set(key, mediumUpstream);
        }
    }

    this.mediumDownstreamData = [];
    this.mediumDownstreamMap.clear();
    for (const medium of this.mediumUpstreamData) {
      const time = this.toISOStringWithTimezone(new Date(medium.date)).substring(0, 10).replace('T', ' ');
      const key = time + '|' + medium.vendorPort;
      const sign = this.signMap.get(key) ?? null;

      const mediumTransition = this.mediumTransitionMap.get(key)!;
      const mediumDownstream: Medium = {
        date: medium.date,
        clientPort: medium.clientPort,
        vendorPort: medium.vendorPort,
        request: 0,
        response: 0,
        impression: 0,
        click: 0,
        income: 0,
        outcomeUpstream: 0,
        outcomeRebate: 0,
        outcomeDownstream: 0,
      };

      if (sign !== null && sign.request !== null) {
        if (mediumTransition?.request === 0) {
          mediumDownstream.request = 0;
        } else {
          mediumDownstream.request = Math.round(1.0 * medium.request! * sign.request / mediumTransition.request!);
        }
      }
      if (sign !== null && sign.response !== null) {
        if (mediumTransition?.response === 0) {
          mediumDownstream.response = 0;
        } else {
          mediumDownstream.response = Math.round(1.0 * medium.response! * sign.response / mediumTransition.response!);
        }
      }
      if (sign !== null && sign.impression !== null) {
        if (mediumTransition?.impression === 0) {
          mediumDownstream.impression = 0;
        } else {
          mediumDownstream.impression = Math.round(1.0 * medium.impression! * sign.impression / mediumTransition.impression!);
        }
      }
      if (sign !== null && sign.click !== null) {
        if (mediumTransition?.click === 0) {
          mediumDownstream.click = 0;
        } else {
          mediumDownstream.click = Math.round(1.0 * medium.click! * sign.click / mediumTransition.click!);
        }
      }
      if (sign !== null && sign.cost !== null) {
        if (mediumTransition?.outcomeDownstream === 0) {
          mediumDownstream.outcomeDownstream = 0;
        } else {
          mediumDownstream.outcomeDownstream = Math.round(1.0 * medium.outcomeDownstream! * sign.cost / mediumTransition.outcomeDownstream!);
        }
      }

      this.mediumDownstreamData.push(mediumDownstream);
    }

    // data ready, refresh port list for filter

    const formQueryUpstream: Query<ClientPort> = {
      filter: {
        clientMode: [String(this.mode())],
        vendorMode: [String(this.mode())],
        client: this.selectedClients.map(client => client.id!.toString()),
        clientMedia: this.selectedClientMedias.map(clientMedia => clientMedia.id!.toString()),
      },
      searchKey: ['name', 'tagId'],
      searchValue: this.searchUpstreamValue,
    };
    const formQueryDownstream: Query<VendorPort> = {
      filter: {
        clientMode: [String(this.mode())],
        vendorMode: [String(this.mode())],
        vendor: this.selectedVendors.map(vendor => vendor.id!.toString()),
        vendorMedia: this.selectedVendorMedias.map(clientMedia => clientMedia.id!.toString()),
      },
      searchKey: ['name', 'tagId'],
      searchValue: this.searchDownstreamValue,
    };

    forkJoin([
      this.clientPortAPI.getClientPortList(formQueryUpstream),
      this.vendorPortAPI.getVendorPortList(formQueryDownstream),
    ]).pipe(
      catchError(() => {
        return scheduled([[], []], asyncScheduler);
      })
    ).subscribe(results => {
      const clientPorts = results[0].map(clientPort => clientPort.id);
      const vendorPorts = results[1].map(vendorPort => vendorPort.id);

      this.performanceViewData.length = 0;
      this.performanceViewMap.clear();
      for (const performance of this.performanceData) {
        if (clientPorts.indexOf(performance.clientPort) < 0 || vendorPorts.indexOf(performance.vendorPort) < 0) {
          continue;
        }

        if (this.minTimestamp > new Date(performance.time)) {
          this.minTimestamp = new Date(performance.time);
        }
        if (this.maxTimestamp < new Date(performance.time)) {
          this.maxTimestamp = new Date(performance.time);
        }

        if (this.mode() === PartnerType.PARTNER_TYPE_PROGRAMMATIC) {
          let time = '';
          if (this.summaryInterval === 'day') {
            time = this.toISOStringWithTimezone(new Date(performance.time)).substring(0, 10).replace('T', ' ');
          }
          if (this.summaryInterval === 'month') {
            time = this.toISOStringWithTimezone(new Date(performance.time)).substring(0, 7).replace('T', ' ');
          }
          if (this.summaryInterval === 'year') {
            time = this.toISOStringWithTimezone(new Date(performance.time)).substring(0, 4).replace('T', ' ');
          }

          let key = time + '|';
          if (this.summaryAggregateUpstream === 'client' || this.summaryAggregateUpstream === 'clientport') {
            key += 'C' + this.clientPortMap.get(performance.clientPort)?.client.id + '|';
          }
          if (this.summaryAggregateUpstream === 'clientport') {
            key += 'CP' + performance.clientPort + '|';
          }
          if (this.summaryAggregateDownstream === 'vendor' || this.summaryAggregateDownstream === 'vendorport') {
            key += 'V' + this.vendorPortMap.get(performance.vendorPort)?.vendor.id + '|';
          }
          if (this.summaryAggregateDownstream === 'vendorport') {
            key += 'VP' + performance.vendorPort + '|';
          }

          if (!this.performanceViewMap.has(key)) {
            const performanceView: PerformanceView = {
              time: time,
              start: new Date(performance.time),
              end: new Date(performance.time),
              client: this.summaryAggregateUpstream === 'client' || this.summaryAggregateUpstream === 'clientport'
                ? performance.clientPort === -1 ?
                    -1
                    :
                    this.clientPortMap.get(performance.clientPort)?.client.id
                      ?? 0
                : 0,
              clientMedia: this.summaryAggregateUpstream === 'clientport'
                ? performance.clientPort === -1 ?
                    -1
                    :
                    this.clientPortMap.get(performance.clientPort)?.clientMedia.id
                      ?? 0
                : 0,
              clientPort: this.summaryAggregateUpstream === 'clientport' ? performance.clientPort : 0,
              vendor: this.summaryAggregateDownstream === 'vendor' || this.summaryAggregateDownstream === 'vendorport'
                ? this.vendorPortMap.get(performance.vendorPort)?.vendor.id ?? 0
                : 0,
              vendorMedia: this.summaryAggregateDownstream === 'vendorport'
                ? this.vendorPortMap.get(performance.vendorPort)?.vendorMedia.id ?? 0
                : 0,
              vendorPort: this.summaryAggregateDownstream === 'vendorport' ? performance.vendorPort : 0,
              request: 0,
              requestv: 0,
              response: 0,
              responsev: 0,
              impression: 0,
              click: 0,
              income: 0,
              outcomeUpstream: 0,
              outcomeRebate: 0,
              outcomeDownstream: 0,
              offer: 0,
            };

            this.performanceViewData.push(performanceView);
            this.performanceViewMap.set(key, performanceView);
          }

          const performanceView = this.performanceViewMap.get(key)!;
          if (performanceView.start > new Date(performance.time)) {
            performanceView.start = new Date(performance.time);
          }
          if (performanceView.end < new Date(performance.time)) {
            performanceView.end = new Date(performance.time);
          }
          performanceView.request +=
            performance.eventA + performance.eventB + performance.eventC + performance.eventD + performance.eventE +
            performance.eventF + performance.eventG + performance.eventH + performance.eventK + performance.eventL +
            performance.eventM + performance.eventN + performance.eventO + performance.eventP;
          performanceView.requestv +=
            performance.eventC + performance.eventD + performance.eventE + performance.eventF + performance.eventK +
            performance.eventO;
          performanceView.response +=
            performance.eventD + performance.eventE + performance.eventK;
          performanceView.responsev +=
            performance.eventD + performance.eventE;
          performanceView.impression += performance.impression;
          performanceView.click += performance.click;
          performanceView.income += performance.income;
          performanceView.outcomeUpstream += performance.outcomeUpstream;
          performanceView.outcomeRebate += performance.outcomeRebate;
          performanceView.outcomeDownstream += performance.outcomeDownstream;

          this.performanceViewTotal.request +=
            performance.eventA + performance.eventB + performance.eventC + performance.eventD + performance.eventE +
            performance.eventF + performance.eventG + performance.eventH + performance.eventK + performance.eventL +
            performance.eventM + performance.eventN + performance.eventO + performance.eventP;
          this.performanceViewTotal.requestv +=
            performance.eventC + performance.eventD + performance.eventE + performance.eventF + performance.eventK +
            performance.eventO;
          this.performanceViewTotal.response +=
            performance.eventD + performance.eventE + performance.eventK;
          this.performanceViewTotal.responsev +=
            performance.eventD + performance.eventE;
          this.performanceViewTotal.impression += performance.impression;
          this.performanceViewTotal.click += performance.click;
          this.performanceViewTotal.income += performance.income;
          this.performanceViewTotal.outcomeUpstream += performance.outcomeUpstream;
          this.performanceViewTotal.outcomeRebate += performance.outcomeRebate;
          this.performanceViewTotal.outcomeDownstream += performance.outcomeDownstream;
        }
      }

      this.mediumViewData.length = 0;
      this.mediumViewMap.clear();
      for (const medium of this.mediumData) {
        if (clientPorts.indexOf(medium.clientPort) < 0 || vendorPorts.indexOf(medium.vendorPort) < 0) {
          continue;
        }

        if (this.mode() === PartnerType.PARTNER_TYPE_DIRECT) {
          if (this.minTimestamp > new Date(medium.date)) {
            this.minTimestamp = new Date(medium.date);
          }
          if (this.maxTimestamp < new Date(medium.date)) {
            this.maxTimestamp = new Date(medium.date);
          }
        }

        let time = '';
        if (this.summaryInterval === 'day') {
          time = this.toISOStringWithTimezone(new Date(medium.date)).substring(0, 10).replace('T', ' ');
        }
        if (this.summaryInterval === 'month') {
          time = this.toISOStringWithTimezone(new Date(medium.date)).substring(0, 7).replace('T', ' ');
        }
        if (this.summaryInterval === 'year') {
          time = this.toISOStringWithTimezone(new Date(medium.date)).substring(0, 4).replace('T', ' ');
        }

        let key = time + '|';
        if (this.summaryAggregateUpstream === 'client' || this.summaryAggregateUpstream === 'clientport') {
          key += 'C' + this.clientPortMap.get(medium.clientPort)?.client.id + '|';
        }
        if (this.summaryAggregateUpstream === 'clientport') {
          key += 'CP' + medium.clientPort + '|';
        }
        if (this.summaryAggregateDownstream === 'vendor' || this.summaryAggregateDownstream === 'vendorport') {
          key += 'V' + this.vendorPortMap.get(medium.vendorPort)?.vendor.id + '|';
        }
        if (this.summaryAggregateDownstream === 'vendorport') {
          key += 'VP' + medium.vendorPort + '|';
        }

        if (!this.mediumViewMap.has(key)) {
          const mediumView: BillView = {
            time: time,
            start: new Date(medium.date),
            end: new Date(medium.date),
            client: this.summaryAggregateUpstream === 'client' || this.summaryAggregateUpstream === 'clientport' ? this.clientPortMap.get(medium.clientPort)?.client.id ?? 0 : 0,
            clientMedia: this.summaryAggregateUpstream === 'clientport' ? this.clientPortMap.get(medium.clientPort)?.clientMedia.id ?? 0 : 0,
            clientPort: this.summaryAggregateUpstream === 'clientport' ? medium.clientPort : 0,
            vendor: this.summaryAggregateDownstream === 'vendor' || this.summaryAggregateDownstream === 'vendorport' ? this.vendorPortMap.get(medium.vendorPort)?.vendor.id ?? 0 : 0,
            vendorMedia: this.summaryAggregateDownstream === 'vendorport' ? this.vendorPortMap.get(medium.vendorPort)?.vendorMedia.id ?? 0 : 0,
            vendorPort: this.summaryAggregateDownstream === 'vendorport' ? medium.vendorPort : 0,
            request: null,
            response: null,
            impression: null,
            click: null,
            cost: null,
            status: 0,
            closed: 0,
            total: 0,
          };

          this.mediumViewData.push(mediumView);
          this.mediumViewMap.set(key, mediumView);
        }

        const mediumView = this.mediumViewMap.get(key)!;
        if (mediumView.start > new Date(medium.date)) {
          mediumView.start = new Date(medium.date);
        }
        if (mediumView.end < new Date(medium.date)) {
          mediumView.end = new Date(medium.date);
        }

        if (medium.request !== null) {
          mediumView.request = mediumView.request === null ? medium.request : mediumView.request + medium.request;
        }
        if (medium.response !== null) {
          mediumView.response = mediumView.response === null ? medium.response : mediumView.response + medium.response;
        }
        if (medium.impression !== null) {
          mediumView.impression = mediumView.impression === null ? medium.impression : mediumView.impression + medium.impression;
        }
        if (medium.click !== null) {
          mediumView.click = mediumView.click === null ? medium.click : mediumView.click + medium.click;
        }
        if (medium.income !== null) {
          mediumView.cost = mediumView.cost === null ? medium.income : mediumView.cost + medium.income;
        }
        mediumView.closed++;
        mediumView.total++;

        if (this.mode() === PartnerType.PARTNER_TYPE_DIRECT) {
          if (!this.performanceViewMap.has(key)) {
            const performanceView: PerformanceView = {
              time: time,
              start: new Date(mediumView.start),
              end: new Date(mediumView.end),
              client: mediumView.client,
              clientMedia: mediumView.clientMedia,
              clientPort: mediumView.clientPort,
              vendor: mediumView.vendor,
              vendorMedia: mediumView.vendorMedia,
              vendorPort: mediumView.vendorPort,
              request: 0,
              requestv: 0,
              response: 0,
              responsev: 0,
              impression: 0,
              click: 0,
              income: 0,
              outcomeUpstream: 0,
              outcomeRebate: 0,
              outcomeDownstream: 0,
              offer: 0,
            };

            this.performanceViewData.push(performanceView);
            this.performanceViewMap.set(key, performanceView);
          }
        }

        this.mediumViewTotal.request += medium.request ?? 0;
        this.mediumViewTotal.response += medium.response ?? 0;
        this.mediumViewTotal.impression += medium.impression ?? 0;
        this.mediumViewTotal.click += medium.click ?? 0;
        this.mediumViewTotal.income += medium.income ?? 0;
      }

      this.signViewData.length = 0;
      this.signViewMap.clear();
      for (const medium of this.mediumDownstreamData) {
        if (clientPorts.indexOf(medium.clientPort) < 0 || vendorPorts.indexOf(medium.vendorPort) < 0) {
          continue;
        }

        if (this.mode() === PartnerType.PARTNER_TYPE_DIRECT) {
          if (this.minTimestamp > new Date(medium.date)) {
            this.minTimestamp = new Date(medium.date);
          }
          if (this.maxTimestamp < new Date(medium.date)) {
            this.maxTimestamp = new Date(medium.date);
          }
        }

        let time = '';
        if (this.summaryInterval === 'day') {
          time = this.toISOStringWithTimezone(new Date(medium.date)).substring(0, 10).replace('T', ' ');
        }
        if (this.summaryInterval === 'month') {
          time = this.toISOStringWithTimezone(new Date(medium.date)).substring(0, 7).replace('T', ' ');
        }
        if (this.summaryInterval === 'year') {
          time = this.toISOStringWithTimezone(new Date(medium.date)).substring(0, 4).replace('T', ' ');
        }

        let key = time + '|';
        if (this.summaryAggregateUpstream === 'client' || this.summaryAggregateUpstream === 'clientport') {
          key += 'C' + this.clientPortMap.get(medium.clientPort)?.client.id + '|';
        }
        if (this.summaryAggregateUpstream === 'clientport') {
          key += 'CP' + medium.clientPort + '|';
        }
        if (this.summaryAggregateDownstream === 'vendor' || this.summaryAggregateDownstream === 'vendorport') {
          key += 'V' + this.vendorPortMap.get(medium.vendorPort)?.vendor.id + '|';
        }
        if (this.summaryAggregateDownstream === 'vendorport') {
          key += 'VP' + medium.vendorPort + '|';
        }

        if (!this.signViewMap.has(key)) {
          const signView: BillView = {
            time: time,
            start: new Date(medium.date),
            end: new Date(medium.date),
            client: 0,
            clientMedia: 0,
            clientPort: 0,
            vendor: this.summaryAggregateDownstream === 'vendor' || this.summaryAggregateDownstream === 'vendorport' ? this.vendorPortMap.get(medium.vendorPort)?.vendor.id ?? 0 : 0,
            vendorMedia: this.summaryAggregateDownstream === 'vendorport' ? this.vendorPortMap.get(medium.vendorPort)?.vendorMedia.id ?? 0 : 0,
            vendorPort: this.summaryAggregateDownstream === 'vendorport' ? medium.vendorPort : 0,
            request: null,
            response: null,
            impression: null,
            click: null,
            cost: null,
            status: 0,
            closed: 0,
            total: 0,
          };

          this.signViewData.push(signView);
          this.signViewMap.set(key, signView);
        }

        const signView = this.signViewMap.get(key)!;
        if (signView.start > new Date(medium.date)) {
          signView.start = new Date(medium.date);
        }
        if (signView.end < new Date(medium.date)) {
          signView.end = new Date(medium.date);
        }
        if (medium.request !== null) {
          signView.request = signView.request === null ? medium.request : signView.request + medium.request;
        }
        if (medium.response !== null) {
          signView.response = signView.response === null ? medium.response : signView.response + medium.response;
        }
        if (medium.impression !== null) {
          signView.impression = signView.impression === null ? medium.impression : signView.impression + medium.impression;
        }
        if (medium.click !== null) {
          signView.click = signView.click === null ? medium.click : signView.click + medium.click;
        }
        if (medium.outcomeDownstream !== null) {
          signView.cost = signView.cost === null ? medium.outcomeDownstream : signView.cost + medium.outcomeDownstream;
        }

        if (this.mode() === PartnerType.PARTNER_TYPE_DIRECT) {
          if (!this.performanceViewMap.has(key)) {
            const performanceView: PerformanceView = {
              time: time,
              start: new Date(signView.start),
              end: new Date(signView.end),
              client: signView.client,
              clientMedia: signView.clientMedia,
              clientPort: signView.clientPort,
              vendor: signView.vendor,
              vendorMedia: signView.vendorMedia,
              vendorPort: signView.vendorPort,
              request: 0,
              requestv: 0,
              response: 0,
              responsev: 0,
              impression: 0,
              click: 0,
              income: 0,
              outcomeUpstream: 0,
              outcomeRebate: 0,
              outcomeDownstream: 0,
              offer: 0,
            };

            this.performanceViewData.push(performanceView);
            this.performanceViewMap.set(key, performanceView);
          }
        }

        this.signViewTotal.request += medium.request ?? 0;
        this.signViewTotal.response += medium.response ?? 0;
        this.signViewTotal.impression += medium.impression ?? 0;
        this.signViewTotal.click += medium.click ?? 0;
        this.signViewTotal.outcomeDownstream += medium.outcomeDownstream ?? 0;
      }

      for (const timestamp of this.timestamps) {
        if (this.minTimestamp > timestamp || this.maxTimestamp < timestamp) {
          continue;
        }

        let time = '';
        if (this.summaryInterval === 'day') {
          time = this.toISOStringWithTimezone(new Date(timestamp)).substring(0, 10).replace('T', ' ');
        }
        if (this.summaryInterval === 'month') {
          time = this.toISOStringWithTimezone(new Date(timestamp)).substring(0, 7).replace('T', ' ');
        }
        if (this.summaryInterval === 'year') {
          time = this.toISOStringWithTimezone(new Date(timestamp)).substring(0, 4).replace('T', ' ');
        }

        let existed = false;
        for (const key of this.performanceViewMap.keys()) {
          if (key.indexOf(time) === 0) {
            existed = true;
            break;
          }
        }

        if (existed) {
          continue;
        }

        const performanceView: PerformanceView = {
          time: time,
          start: new Date(0),
          end: new Date(0),
          client: 0,
          clientMedia: 0,
          clientPort: 0,
          vendor: 0,
          vendorMedia: 0,
          vendorPort: 0,
          request: 0,
          requestv: 0,
          response: 0,
          responsev: 0,
          impression: 0,
          click: 0,
          income: 0,
          outcomeUpstream: 0,
          outcomeRebate: 0,
          outcomeDownstream: 0,
          offer: 0,
        };

        this.performanceViewData.push(performanceView);
        this.performanceViewMap.set(time + '|', performanceView);
      }

      const data = this.performanceViewData.sort((a, b) => {
        const keya = a.time + '|' + a.clientPort + '|' + a.vendorPort;
        const keyb = b.time + '|' + b.clientPort + '|' + b.vendorPort;
        return keya > keyb ? -1 : 1;
      });

      this.dataSource.set(this.createDataSource(data));
    });
  }

  private createDataSource(data: PerformanceView[]): MatTableDataSource<PerformanceView> {
    const dataSource = new MatTableDataSource(data);
    dataSource.sort = this.sort() ?? null;
    dataSource.paginator = this.paginator() ?? null;
    if (this.mode() === PartnerType.PARTNER_TYPE_PROGRAMMATIC) {
      dataSource.sortingDataAccessor = (item, property) => {
        switch (property) {
          case 'gfr': return item.requestv ? (1.0 * (item.response ?? 0) / item.requestv) : -1;
          case 'gfrv': return item.requestv ? (1.0 * (item.responsev ?? 0) / item.requestv) : -1;
          case 'er': return item.response ? (1.0 * (item.impression ?? 0) / item.response) : -1;
          case 'ctr': return item.impression ? (1.0 * (item.click ?? 0) / item.impression) : -1;
          case 'rv': return item.requestv ? (1.0 * (item.income ?? 0) / item.requestv / 10) : -1;
          case 'cpm': return item.impression ? (1.0 * (item.income ?? 0) / 100 / item.impression) : -1;
          case 'upstream': return this.clientPortMap.get(item.clientPort)?.name ?? '';
          case 'downstream': return this.vendorPortMap.get(item.vendorPort)?.name ?? '';
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
    }
    if (this.mode() === PartnerType.PARTNER_TYPE_DIRECT) {
      dataSource.sortingDataAccessor = (item, property) => {
          switch (property) {
          case 'gfr': return this.getMediumData(item)?.request ? (1.0 * (this.getMediumData(item)?.response ?? 0) / this.getMediumData(item)!.request!) : -1;
          case 'gfrv': return this.getMediumData(item)?.request ? (1.0 * (this.getMediumData(item)?.response ?? 0) / this.getMediumData(item)!.request!) : -1;
          case 'er': return this.getMediumData(item)?.response ? (1.0 * (this.getMediumData(item)?.impression ?? 0) / this.getMediumData(item)!.response!) : -1;
          case 'ctr': return this.getMediumData(item)?.impression ? (1.0 * (this.getMediumData(item)?.click ?? 0) / this.getMediumData(item)!.impression!) : -1;
          case 'rv': return this.getMediumData(item)?.request ? (1.0 * (this.getMediumData(item)?.cost ?? 0) / this.getMediumData(item)!.request! / 10) : -1;
          case 'cpm': return this.getMediumData(item)?.impression ? (1.0 * (this.getMediumData(item)?.cost ?? 0) / 100 / this.getMediumData(item)!.impression!) : -1;
          case 'upstream': return this.clientPortMap.get(item.clientPort)?.name ?? '';
          case 'downstream': return this.vendorPortMap.get(item.vendorPort)?.name ?? '';
          default: {
            const mediumData = this.getMediumData(item);
            const value = mediumData ? mediumData[property as keyof BillView] : undefined;
            if (typeof value === 'number') {
              return value;
            } else {
              return value ? value.toString() : '';
            }
          }
        }
      };
    }
    return dataSource;
  }

  getMediumData(row: PerformanceView): BillView | null {
    let key = row.time + '|';
    if (this.summaryAggregateUpstream === 'client' || this.summaryAggregateUpstream === 'clientport') {
      key += 'C' + row.client + '|';
    }
    if (this.summaryAggregateUpstream === 'clientport') {
      key += 'CP' + row.clientPort + '|';
    }
    if (this.summaryAggregateDownstream === 'vendor' || this.summaryAggregateDownstream === 'vendorport') {
      key += 'V' + row.vendor + '|';
    }
    if (this.summaryAggregateDownstream === 'vendorport') {
      key += 'VP' + row.vendorPort + '|';
    }

    return this.mediumViewMap.get(key) ?? null;
  }

  getSignData(row: PerformanceView): BillView | null {
    let key = row.time + '|';
    if (this.summaryAggregateUpstream === 'client' || this.summaryAggregateUpstream === 'clientport') {
      key += 'C' + row.client + '|';
    }
    if (this.summaryAggregateUpstream === 'clientport') {
      key += 'CP' + row.clientPort + '|';
    }
    if (this.summaryAggregateDownstream === 'vendor' || this.summaryAggregateDownstream === 'vendorport') {
      key += 'V' + row.vendor + '|';
    }
    if (this.summaryAggregateDownstream === 'vendorport') {
      key += 'VP' + row.vendorPort + '|';
    }

    return this.signViewMap.get(key) ?? null;
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

  popupClientPort(clientPort: ClientPort, tab: string) {
    this.dialog.open<ClientPortDialogComponent, ClientPortDialogData>(ClientPortDialogComponent, {
      data: {
        mode: this.mode(),
        tab: tab,
        clientMediaId: 0,
        clientPort: clientPort,
      },
      minWidth: '80vw',
      minHeight: '80vh',
      maxWidth: '80vw',
      maxHeight: '80vh',
    });
  }

  popupVendorPort(vendorPort: VendorPort, tab: string) {
    this.dialog.open<VendorPortDialogComponent, VendorPortDialogData>(VendorPortDialogComponent, {
      data: {
        mode: this.mode(),
        tab: tab,
        vendorMediaId: 0,
        vendorPort: vendorPort,
      },
      minWidth: '80vw',
      minHeight: '80vh',
      maxWidth: '80vw',
      maxHeight: '80vh',
    });
  }

}
