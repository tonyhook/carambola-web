import { AfterViewInit, Component, DoCheck, effect, ElementRef, HostListener, KeyValueDiffer, KeyValueDiffers, OnInit, signal, ViewChild, WritableSignal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { UntypedFormGroup, UntypedFormBuilder, ReactiveFormsModule, UntypedFormControl } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
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
import { CdkMenuModule } from '@angular/cdk/menu';
import { asyncScheduler, catchError, debounceTime, forkJoin, scheduled, Subject, switchMap } from 'rxjs';

import { BillAPI, BillView, Client, ClientAPI, ClientMedia, ClientMediaAPI, ClientPort, ClientPortAPI, ConnectionAPI, Medium, PartnerType, PerformanceAPI, PerformancePartner, PerformancePlaceholder, Query, Sign, SignStatus, TimedPairedVendorPortMap, Vendor, VendorAPI, VendorMedia, VendorMediaAPI, VendorPort, VendorPortAPI } from '../../../../core';
import { TenantService } from '../../../../services';
import { AdEntityComponent, FilteredSelectVendorComponent, FilteredSelectVendorMediaComponent } from '../../../../shared';
import { ClientPortDialogComponent, ClientPortDialogData } from '../clientport-dialog/clientport-dialog.component';
import { VendorPortDialogComponent, VendorPortDialogData } from '../vendorport-dialog/vendorport-dialog.component';
import { SignDialogComponent, SignDialogData } from '../sign-dialog/sign-dialog.component';

@Component({
  selector: 'carambola-sign',
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
    FilteredSelectVendorComponent,
    FilteredSelectVendorMediaComponent,
    AdEntityComponent,
  ],
  templateUrl: './sign.component.html',
  styleUrls: ['./sign.component.scss'],
  animations: [
    trigger('detailExpand', [
      state('collapsed, void', style({height: '0px', visibility: 'hidden'})),
      state('expanded', style({height: '*', visibility: 'visible'})),
      transition('expanded <=> collapsed, void <=> *', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ],
})
export class SignComponent implements OnInit, AfterViewInit, DoCheck {
  private formBuilder = inject(UntypedFormBuilder);
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

  SignStatus = SignStatus;

  displayedColumns: string[] = [];
  displayedColumnsWidth = 0;
  scrollLeft = 0;
  scrollRight = 0;
  tableWidth = 0;
  candidateColumns: Map<string, string> = new Map<string, string>();
  hoverRow: BillView | null = null;
  expandedRow: BillView | null = null;
  loading = false;
  formGroupColumn: UntypedFormGroup;

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
  formGroupQuery: UntypedFormGroup;
  filterMode: Map<string, string>;
  formQuery: Query<PerformancePlaceholder> = {
    filter: {},
    searchKey: ['name', 'tagId'],
    searchValue: '',
  };
  formQuerySub: Query<PerformancePlaceholder> = {
    filter: {},
    searchKey: ['name', 'tagId'],
    searchValue: '',
  };
  range: UntypedFormGroup;
  differ: KeyValueDiffer<string, unknown>;

  signAggregateUpstream = 'all';
  signAggregateDownstream = 'all';
  signStatusFilter = [SignStatus.SIGN_STATUS_PENDING, SignStatus.SIGN_STATUS_READY, SignStatus.SIGN_STATUS_CREATED, SignStatus.SIGN_STATUS_SIGNED];

  signInterval = 'day';
  signStart = new Date();
  signEnd = new Date();

  timestamps: Date[] = [];
  minTimestamp: Date = new Date();
  maxTimestamp: Date = new Date();
  signData: Sign[] = [];
  connectionData: TimedPairedVendorPortMap = {};
  performanceData: PerformancePartner[] = [];

  signViewData: BillView[] = [];
  signViewDataSelected: BillView[] = [];
  signViewFullySigned = false;
  signViewFullyCreated = false;
  signViewFullyReady = false;
  signViewFullyPending = false;
  signViewMap: Map<string, BillView> = new Map<string, BillView>();
  signViewTotal: BillView = {
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
    status: SignStatus.SIGN_STATUS_IGNORE,
    closed: 0,
    total: 0,
  };
  mediumData: Medium[] = [];
  signViewDataSub: BillView[] = [];
  signViewMapSub: Map<string, BillView> = new Map<string, BillView>();

  @ViewChild(MatSort, {static: false}) sort: MatSort | null = null;
  @ViewChild(MatPaginator, {static: false}) paginator: MatPaginator | null = null;
  @ViewChild('table', {static: false}) table: ElementRef | null = null;

  dataRequest$ = new Subject<Query<PerformancePlaceholder>>();
  dataSource = new MatTableDataSource<BillView>([]);
  dataRequestSub$ = new Subject<Query<PerformancePlaceholder>>();
  dataSourceSub = new MatTableDataSource<BillView>([]);

  constructor() {
    this.formGroupColumn = this.formBuilder.group({
      'column': [[], null],
    });
    this.formGroupQuery = this.formBuilder.group({
      'vendor': [[], null],
      'vendorMedia': [[], null],
      'format': [[], null],
      'mode': [[], null],
      'search': ['', null],
    });

    this.filterMode = new Map([
      ['1', '分成模式'],
      ['2', '竞价模式'],
      ['3', '直通模式'],
    ]);

    this.range = new UntypedFormGroup({
      start: new UntypedFormControl(),
      end: new UntypedFormControl(),
    });
    this.differ = this.differs.find(this.range.value).create();

    effect(() => {
      const mode = this.mode();
      const tenant = this.tenantService.tenant();

      if (mode === PartnerType.PARTNER_TYPE_UNKNOWN) {
        return;
      }
      if (!tenant) {
        return;
      }

      this.dataSource.data = [];
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
        request: null,
        response: null,
        impression: null,
        click: null,
        cost: null,
        status: SignStatus.SIGN_STATUS_IGNORE,
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
        this.candidateColumns.set('cpm', 'eCPM');
        this.candidateColumns.set('request', '请求');
        this.candidateColumns.set('response', '响应');
        this.candidateColumns.set('gfr', '填充率');
        this.candidateColumns.set('er', '展现率');
        this.candidateColumns.set('rv', '请求价值');
        this.formGroupColumn.patchValue({['column']: [...this.candidateColumns.keys()]});

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

        if (this.range.value.start && this.range.value.end) {
          timeStart = new Date(Date.parse(this.range.value.start));
          timeEnd = new Date(Date.parse(this.range.value.end) + 86399999);
          if (timeEnd.getTime() > time.getTime()) {
            timeEnd = new Date(time);
          }
        }

        if (this.signInterval === 'day') {
          if (this.range.value.start && this.range.value.end) {
            this.signStart = new Date(timeStart);
            this.signEnd = new Date(timeEnd);
          } else {
            this.signEnd = new Date(time);
            time.setMilliseconds(0);
            time.setSeconds(0);
            time.setMinutes(0);
            time.setHours(0);
            time.setDate(time.getDate() - 30);
            this.signStart = new Date(time);
          }
        }
        if (this.signInterval === 'month') {
          if (this.range.value.start && this.range.value.end) {
            this.signStart = new Date(timeStart);
            this.signEnd = new Date(timeEnd);
          } else {
            this.signEnd = new Date(time);
            time.setMilliseconds(0);
            time.setSeconds(0);
            time.setMinutes(0);
            time.setHours(0);
            time.setMonth(time.getMonth() - 12);
            this.signStart = new Date(time);
          }
        }
        if (this.signInterval === 'year') {
          if (this.range.value.start && this.range.value.end) {
            this.signStart = new Date(timeStart);
            this.signEnd = new Date(timeEnd);
          } else {
            this.signEnd = new Date(time);
            time.setMilliseconds(0);
            time.setSeconds(0);
            time.setMinutes(0);
            time.setHours(0);
            time.setFullYear(time.getFullYear() - 3);
            this.signStart = new Date(time);
          }
        }

        return forkJoin([
          this.billAPI.getSignList(
            this.signInterval,
            this.toISOStringWithTimezone(this.signStart),
            this.toISOStringWithTimezone(this.signEnd),
            query
          ),
          this.performanceAPI.getPerformanceVendorList(
            this.signInterval,
            true,
            this.toISOStringWithTimezone(this.signStart),
            this.toISOStringWithTimezone(this.signEnd),
            query
          ),
          this.billAPI.getMediumListVendor(
            this.signInterval,
            this.toISOStringWithTimezone(this.signStart),
            this.toISOStringWithTimezone(this.signEnd),
            query
          ),
          this.connectionAPI.getPairedClientPortMap(
            this.toISOStringWithTimezone(this.signStart),
            this.toISOStringWithTimezone(this.signEnd),
            query
          ),
        ]).pipe(
          catchError(() => {
            return scheduled([[], [], [], []], asyncScheduler);
          })
        );
      }),
    ).subscribe(results => {
      this.signData = results[0];
      this.performanceData = results[1];
      this.mediumData = results[2];
      this.connectionData = results[3];
      this.prepareTimestampList();
      this.updateSignView();
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

      if (this.mode() === PartnerType.PARTNER_TYPE_DIRECT) {
        if (this.formGroupQuery.value.mode.indexOf(PartnerType.PARTNER_TYPE_DIRECT) < 0) {
          this.formGroupQuery.controls['mode'].setValue([]);
        }
        this.filterMode = new Map([
          ['3', '直通模式'],
        ]);
      }
      if (this.mode() === PartnerType.PARTNER_TYPE_PROGRAMMATIC) {
        if (this.formGroupQuery.value.mode.indexOf(PartnerType.PARTNER_TYPE_DIRECT) >= 0) {
          this.formGroupQuery.controls['mode'].setValue([]);
        }
        this.filterMode = new Map([
          ['1', '分成模式'],
          ['2', '竞价模式'],
        ]);
      }
    });
  }

  ngDoCheck(): void {
    const changes = this.differ.diff(this.range.value);
    if (changes) {
      if (this.range.value.start && this.range.value.end) {
        this.query();
      }
    }
  }

  mouseenter(row: BillView) {
    this.hoverRow = row;
  }

  mouseleave() {
    this.hoverRow = null;
  }

  expand(row: BillView) {
    this.expandedRow = this.expandedRow === row ? null : row;
    if (!this.expandedRow) {
      return;
    }

    this.signViewDataSub.length = 0;
    this.signViewMapSub.clear();
    this.dataSourceSub.data = [];

    this.updateSignViewSub();
  }

  query() {
    this.formQuery = {
      filter: {
        clientMode: [String(this.mode())],
        vendorMode: [String(this.mode())],
        vendor: (this.formGroupQuery.value.vendor as Vendor[]).map(vendor => vendor.id!.toString()),
        vendorMedia: (this.formGroupQuery.value.vendorMedia as VendorMedia[]).map(vendoMedia => vendoMedia.id!.toString()),
        mode: this.formGroupQuery.value.mode,
      },
      searchKey: ['name', 'tagId'],
      searchValue: this.formGroupQuery.value.search,
    };

    this.dataRequest$.next(this.formQuery);
  }

  upload(target: EventTarget | null) {
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

  download() {
    const time = new Date();
    let timeStart = new Date(time);
    let timeEnd = new Date(time);

    if (this.range.value.start && this.range.value.end) {
      timeStart = new Date(Date.parse(this.range.value.start));
      timeEnd = new Date(Date.parse(this.range.value.end) + 86399999);
      if (timeEnd.getTime() > time.getTime()) {
        timeEnd = new Date(time);
      }
    }

    if (this.signInterval === 'day') {
      if (this.range.value.start && this.range.value.end) {
        this.signStart = new Date(timeStart);
        this.signEnd = new Date(timeEnd);
      } else {
        this.signEnd = new Date(time);
        time.setMilliseconds(0);
        time.setSeconds(0);
        time.setMinutes(0);
        time.setHours(0);
        time.setDate(time.getDate() - 30);
        this.signStart = new Date(time);
      }
    }
    if (this.signInterval === 'month') {
      if (this.range.value.start && this.range.value.end) {
        this.signStart = new Date(timeStart);
        this.signEnd = new Date(timeEnd);
      } else {
        this.signEnd = new Date(time);
        time.setMilliseconds(0);
        time.setSeconds(0);
        time.setMinutes(0);
        time.setHours(0);
        time.setMonth(time.getMonth() - 12);
        this.signStart = new Date(time);
      }
    }
    if (this.signInterval === 'year') {
      if (this.range.value.start && this.range.value.end) {
        this.signStart = new Date(timeStart);
        this.signEnd = new Date(timeEnd);
      } else {
        this.signEnd = new Date(time);
        time.setMilliseconds(0);
        time.setSeconds(0);
        time.setMinutes(0);
        time.setHours(0);
        time.setFullYear(time.getFullYear() - 3);
        this.signStart = new Date(time);
      }
    }

    this.billAPI.downloadSign(
      this.signInterval,
      this.signAggregateDownstream,
      this.toISOStringWithTimezone(this.signStart),
      this.toISOStringWithTimezone(this.signEnd),
      this.formQuery,
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

  clear(event: Event, field: string, value: string | unknown[]) {
    event.stopPropagation();
    this.formGroupQuery.patchValue({[field]: value});
    this.query();
  }

  changeSignInterval(event: MatButtonToggleChange) {
    if (event.value !== this.signInterval) {
      this.signInterval = event.value;
      this.query();
    }
  }

  changeSignAggregateUpstream(event: MatButtonToggleChange) {
    if (event.value !== this.signAggregateUpstream) {
      this.signAggregateUpstream = event.value;
      if (this.expandedRow) {
        this.updateSignViewSub();
      }
    }
  }

  changeSignAggregateDownstream(event: MatButtonToggleChange) {
    if (event.value !== this.signAggregateDownstream) {
      this.signAggregateDownstream = event.value;
      this.prepareDisplayColumns();

      this.updateSignView();
    }
  }

  changeSignStatus(event: MatButtonToggleChange) {
    this.signStatusFilter = event.value;
    this.updateSignView();
  }

  prepareDisplayColumns() {
    this.displayedColumns = ['expand', 'time'];
    this.displayedColumnsWidth = 80 + 250;
    if (this.signAggregateDownstream === 'vendor' || this.signAggregateDownstream === 'vendorport') {
      this.displayedColumns.push('partner');
      // time column is 120px when partner column exists
      this.displayedColumnsWidth = this.displayedColumnsWidth - 250 + 120 + 250;
    }
    this.displayedColumns = [...this.displayedColumns, ...this.formGroupColumn.value.column, 'actions'];
    this.displayedColumnsWidth = this.displayedColumnsWidth + this.formGroupColumn.value.column.length * 120 + 150;

    this.onResize();
  }

  prepareTimestampList() {
    this.timestamps = [];

    for (let t = this.signEnd.getTime(); t >= this.signStart.getTime();) {
      const date = new Date(t);
      if (this.signInterval === 'day') {
        date.setMilliseconds(0);
        date.setSeconds(0);
        date.setMinutes(0);
        date.setHours(0);
      }
      if (this.signInterval === 'month') {
        date.setMilliseconds(0);
        date.setSeconds(0);
        date.setMinutes(0);
        date.setHours(0);
        date.setDate(1);
      }
      if (this.signInterval === 'year') {
        date.setMilliseconds(0);
        date.setSeconds(0);
        date.setMinutes(0);
        date.setHours(0);
        date.setDate(1);
        date.setMonth(0);
      }

      this.timestamps.push(date);
      t = date.getTime();

      if (this.signInterval === 'day') {
        t = t - 86400000;
      }
      if (this.signInterval === 'month') {
        const date = new Date(t);
        date.setMonth(date.getMonth() - 1);
        t = date.getTime();
      }
      if (this.signInterval === 'year') {
        const date = new Date(t);
        date.setFullYear(date.getFullYear() - 1);
        t = date.getTime();
      }
    }
  }

  updateSignView() {
    this.expandedRow = null;
    this.signViewDataSelected = [];
    this.updatebSignViewDataSelectedStatus();

    this.minTimestamp = this.signEnd;
    this.maxTimestamp = this.signStart;
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
      request: null,
      response: null,
      impression: null,
      click: null,
      cost: null,
      status: SignStatus.SIGN_STATUS_IGNORE,
      closed: 0,
      total: 0,
    };

    const dateKeys = new Set<string>();
    const signKeys = new Set<string>();
    const connectionKeys = new Set<string>();

    this.signViewData.length = 0;
    this.signViewMap.clear();
    for (const sign of this.signData) {
      if (this.minTimestamp > new Date(sign.date)) {
        this.minTimestamp = new Date(sign.date);
      }
      if (this.maxTimestamp < new Date(sign.date)) {
        this.maxTimestamp = new Date(sign.date);
      }

      if (this.signAggregateDownstream !== 'vendorport' || this.signInterval !== 'day' || this.signStatusFilter.indexOf(sign.status) >= 0) {
        let time = '';
        if (this.signInterval === 'day') {
          time = this.toISOStringWithTimezone(new Date(sign.date)).substring(0, 10).replace('T', ' ');
        }
        if (this.signInterval === 'month') {
          time = this.toISOStringWithTimezone(new Date(sign.date)).substring(0, 7).replace('T', ' ');
        }
        if (this.signInterval === 'year') {
          time = this.toISOStringWithTimezone(new Date(sign.date)).substring(0, 4).replace('T', ' ');
        }

        let key = time + '|';
        if (this.signAggregateDownstream === 'vendor' || this.signAggregateDownstream === 'vendorport') {
          key += 'V' + this.vendorPortMap.get(sign.vendorPort)?.vendor.id + '|';
        }
        if (this.signAggregateDownstream === 'vendorport') {
          key += 'VP' + sign.vendorPort + '|';
        }

        if (!this.signViewMap.has(key)) {
          const signView: BillView = {
            time: time,
            start: new Date(sign.date),
            end: new Date(sign.date),
            client: 0,
            clientMedia: 0,
            clientPort: 0,
            vendor: this.signAggregateDownstream === 'vendor' || this.signAggregateDownstream === 'vendorport' ? this.vendorPortMap.get(sign.vendorPort)?.vendor.id ?? 0 : 0,
            vendorMedia: this.signAggregateDownstream === 'vendorport' ? this.vendorPortMap.get(sign.vendorPort)?.vendorMedia.id ?? 0 : 0,
            vendorPort: this.signAggregateDownstream === 'vendorport' ? sign.vendorPort : 0,
            request: null,
            response: null,
            impression: null,
            click: null,
            cost: null,
            status: SignStatus.SIGN_STATUS_SIGNED,
            closed: 0,
            total: 0,
          };

          this.signViewData.push(signView);
          this.signViewMap.set(key, signView);
        }

        const signView = this.signViewMap.get(key)!;
        if (signView.start > new Date(sign.date)) {
          signView.start = new Date(sign.date);
        }
        if (signView.end < new Date(sign.date)) {
          signView.end = new Date(sign.date);
        }
        if (sign.request !== null) {
          signView.request = signView.request === null ? sign.request : signView.request + sign.request;
        }
        if (sign.response !== null) {
          signView.response = signView.response === null ? sign.response : signView.response + sign.response;
        }
        if (sign.impression !== null) {
          signView.impression = signView.impression === null ? sign.impression : signView.impression + sign.impression;
        }
        if (sign.click !== null) {
          signView.click = signView.click === null ? sign.click : signView.click + sign.click;
        }
        if (sign.cost !== null) {
          signView.cost = signView.cost === null ? sign.cost : signView.cost + sign.cost;
        }

        if ((signView.status === SignStatus.SIGN_STATUS_SIGNED || signView.status === SignStatus.SIGN_STATUS_CREATED) && sign.status === SignStatus.SIGN_STATUS_CREATED) {
          signView.status = SignStatus.SIGN_STATUS_CREATED;
        }
        if (sign.status === SignStatus.SIGN_STATUS_READY) {
          signView.status = SignStatus.SIGN_STATUS_READY;
        }
        const vendorPortList = this.connectionData[new Date(sign.date).getTime()];
        if (vendorPortList) {
          const pairedClientPortList = vendorPortList[sign.vendorPort];

          signView.closed += pairedClientPortList.length;
          signView.total += pairedClientPortList.length;
        }

        if (sign.request !== null) {
          this.signViewTotal.request = this.signViewTotal.request === null ? sign.request : this.signViewTotal.request + sign.request;
        }
        if (sign.response !== null) {
          this.signViewTotal.response = this.signViewTotal.response === null ? sign.response : this.signViewTotal.response + sign.response;
        }
        if (sign.impression !== null) {
          this.signViewTotal.impression = this.signViewTotal.impression === null ? sign.impression : this.signViewTotal.impression + sign.impression;
        }
        if (sign.click !== null) {
          this.signViewTotal.click = this.signViewTotal.click === null ? sign.click : this.signViewTotal.click + sign.click;
        }
        if (sign.cost !== null) {
          this.signViewTotal.cost = this.signViewTotal.cost === null ? sign.cost : this.signViewTotal.cost + sign.cost;
        }
      }

      dateKeys.add(this.toISOStringWithTimezone(new Date(sign.date)).substring(0, 10).replace('T', ' '));
      signKeys.add(this.toISOStringWithTimezone(new Date(sign.date)).substring(0, 10).replace('T', ' ') + '|' + sign.vendorPort);
    }

    if (this.signAggregateDownstream !== 'vendorport' || this.signInterval !== 'day' || this.signStatusFilter.indexOf(SignStatus.SIGN_STATUS_PENDING) >= 0) {
      for (const medium of this.mediumData) {
        if (signKeys.has(this.toISOStringWithTimezone(new Date(medium.date)).substring(0, 10).replace('T', ' ') + '|' + medium.vendorPort)) {
          continue;
        }

        let time = '';
        if (this.signInterval === 'day') {
          time = this.toISOStringWithTimezone(new Date(medium.date)).substring(0, 10).replace('T', ' ');
        }
        if (this.signInterval === 'month') {
          time = this.toISOStringWithTimezone(new Date(medium.date)).substring(0, 7).replace('T', ' ');
        }
        if (this.signInterval === 'year') {
          time = this.toISOStringWithTimezone(new Date(medium.date)).substring(0, 4).replace('T', ' ');
        }

        let key = time + '|';
        if (this.signAggregateDownstream === 'vendor' || this.signAggregateDownstream === 'vendorport') {
          key += 'V' + this.vendorPortMap.get(medium.vendorPort)?.vendor.id + '|';
        }
        if (this.signAggregateDownstream === 'vendorport') {
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
            vendor: this.signAggregateDownstream === 'vendor' || this.signAggregateDownstream === 'vendorport' ? this.vendorPortMap.get(medium.vendorPort)?.vendor.id ?? 0 : 0,
            vendorMedia: this.signAggregateDownstream === 'vendorport' ? this.vendorPortMap.get(medium.vendorPort)?.vendorMedia.id ?? 0 : 0,
            vendorPort: this.signAggregateDownstream === 'vendorport' ? medium.vendorPort : 0,
            request: null,
            response: null,
            impression: null,
            click: null,
            cost: null,
            status: SignStatus.SIGN_STATUS_PENDING,
            closed: 0,
            total: 0,
          }

          this.signViewData.push(signView);
          this.signViewMap.set(key, signView);
        }

        const signView = this.signViewMap.get(key)!;
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
        signView.total++;

        if (medium.request !== null) {
          this.signViewTotal.request = this.signViewTotal.request === null ? medium.request : this.signViewTotal.request + medium.request;
        }
        if (medium.response !== null) {
          this.signViewTotal.response = this.signViewTotal.response === null ? medium.response : this.signViewTotal.response + medium.response;
        }
        if (medium.impression !== null) {
          this.signViewTotal.impression = this.signViewTotal.impression === null ? medium.impression : this.signViewTotal.impression + medium.impression;
        }
        if (medium.click !== null) {
          this.signViewTotal.click = this.signViewTotal.click === null ? medium.click : this.signViewTotal.click + medium.click;
        }
        if (medium.outcomeDownstream !== null) {
          this.signViewTotal.cost = this.signViewTotal.cost === null ? medium.outcomeDownstream : this.signViewTotal.cost + medium.outcomeDownstream;
        }

        dateKeys.add(this.toISOStringWithTimezone(new Date(medium.date)).substring(0, 10).replace('T', ' '));
        signKeys.add(this.toISOStringWithTimezone(new Date(medium.date)).substring(0, 10).replace('T', ' ') + '|' + medium.vendorPort);
        connectionKeys.add(this.toISOStringWithTimezone(new Date(medium.date)).substring(0, 10).replace('T', ' ') + '|' + medium.clientPort + '|' + medium.vendorPort);
      }

      const performanceMap = new Map<string, PerformancePartner>();
      for (const performance of this.performanceData) {
        let time = '';
        if (this.signInterval === 'day') {
          time = this.toISOStringWithTimezone(new Date(performance.time)).substring(0, 10).replace('T', ' ');
        }
        if (this.signInterval === 'month') {
          time = this.toISOStringWithTimezone(new Date(performance.time)).substring(0, 7).replace('T', ' ');
        }
        if (this.signInterval === 'year') {
          time = this.toISOStringWithTimezone(new Date(performance.time)).substring(0, 4).replace('T', ' ');
        }

        let key = time + '|';
        if (this.signAggregateDownstream === 'vendor' || this.signAggregateDownstream === 'vendorport') {
          key += 'V' + this.vendorPortMap.get(performance.vendorPort)?.vendor.id + '|';
        }
        if (this.signAggregateDownstream === 'vendorport') {
          key += 'VP' + performance.vendorPort + '|';
        }

        if (!performanceMap.has(key)) {
          const performanceNew: PerformancePartner = {
            id: null,
            time: performance.time,
            vendorPort: performance.vendorPort,
            clientPort: performance.clientPort,
            bundle: '',
            eventA: 0,
            eventB: 0,
            eventC: 0,
            eventD: 0,
            eventE: 0,
            eventF: 0,
            eventG: 0,
            eventH: 0,
            eventI: 0,
            eventJ: 0,
            eventK: 0,
            eventL: 0,
            eventM: 0,
            eventN: 0,
            eventO: 0,
            general: {},
            impression: 0,
            click: 0,
            income: 0,
            outcomeUpstream: 0,
            outcomeRebate: 0,
            outcomeDownstream: 0,
            offer: 0,
          };

          performanceMap.set(key, performanceNew);
        }

        const existingPerformance = performanceMap.get(key)!;
        existingPerformance.eventA += performance.eventA;
        existingPerformance.eventB += performance.eventB;
        existingPerformance.eventC += performance.eventC;
        existingPerformance.eventD += performance.eventD;
        existingPerformance.eventE += performance.eventE;
        existingPerformance.eventF += performance.eventF;
        existingPerformance.eventG += performance.eventG;
        existingPerformance.eventH += performance.eventH;
        existingPerformance.eventI += performance.eventI;
        existingPerformance.eventJ += performance.eventJ;
        existingPerformance.impression += performance.impression;
        existingPerformance.click += performance.click;
        existingPerformance.outcomeDownstream += performance.outcomeDownstream;
      }

      for (const performance of performanceMap.values()) {
        let processed = false;

        if (signKeys.has(this.toISOStringWithTimezone(new Date(performance.time)).substring(0, 10).replace('T', ' ') + '|' + performance.vendorPort)) {
          processed = true;
        }
        if (connectionKeys.has(this.toISOStringWithTimezone(new Date(performance.time)).substring(0, 10).replace('T', ' ') + '|' + performance.clientPort + '|' + performance.vendorPort)) {
          processed = true;
        }

        let time = '';
        if (this.signInterval === 'day') {
          time = this.toISOStringWithTimezone(new Date(performance.time)).substring(0, 10).replace('T', ' ');
        }
        if (this.signInterval === 'month') {
          time = this.toISOStringWithTimezone(new Date(performance.time)).substring(0, 7).replace('T', ' ');
        }
        if (this.signInterval === 'year') {
          time = this.toISOStringWithTimezone(new Date(performance.time)).substring(0, 4).replace('T', ' ');
        }

        let key = time + '|';
        if (this.signAggregateDownstream === 'vendor' || this.signAggregateDownstream === 'vendorport') {
          key += 'V' + this.vendorPortMap.get(performance.vendorPort)?.vendor.id + '|';
        }
        if (this.signAggregateDownstream === 'vendorport') {
          key += 'VP' + performance.vendorPort + '|';
        }

        if (!this.signViewMap.has(key)) {
          const signView: BillView = {
            time: time,
            start: new Date(performance.time),
            end: new Date(performance.time),
            client: 0,
            clientMedia: 0,
            clientPort: 0,
            vendor: this.signAggregateDownstream === 'vendor' || this.signAggregateDownstream === 'vendorport' ? this.vendorPortMap.get(performance.vendorPort)?.vendor.id ?? 0 : 0,
            vendorMedia: this.signAggregateDownstream === 'vendorport' ? this.vendorPortMap.get(performance.vendorPort)?.vendorMedia.id ?? 0 : 0,
            vendorPort: this.signAggregateDownstream === 'vendorport' ? performance.vendorPort : 0,
            request: null,
            response: null,
            impression: null,
            click: null,
            cost: null,
            status: SignStatus.SIGN_STATUS_PENDING,
            closed: 0,
            total: 0,
          }

          this.signViewData.push(signView);
          this.signViewMap.set(key, signView);
        }

        const signView = this.signViewMap.get(key)!;
        if (!processed || signView.request === null) {
          signView.request = signView.request === null ?
            performance.eventA + performance.eventB + performance.eventC + performance.eventD + performance.eventE +
            performance.eventF + performance.eventG + performance.eventH + performance.eventI + performance.eventJ
          : signView.request +
            performance.eventA + performance.eventB + performance.eventC + performance.eventD + performance.eventE +
            performance.eventF + performance.eventG + performance.eventH + performance.eventI + performance.eventJ;
        }
        if (!processed || signView.response === null) {
          signView.response = signView.response === null ?
            performance.eventI + performance.eventJ
          : signView.response +
            performance.eventI + performance.eventJ;
        }
        if (!processed || signView.request === null) {
          signView.impression = signView.impression === null ? performance.impression : signView.impression + performance.impression;
        }
        if (!processed || signView.request === null) {
          signView.click = signView.click === null ? performance.click : signView.click + performance.click;
        }
        if (!processed || signView.request === null) {
          signView.cost = signView.cost === null ? performance.outcomeDownstream : signView.cost + performance.outcomeDownstream;
        }
        signView.total++;

        if (!processed || this.signViewTotal.request === null) {
          this.signViewTotal.request = this.signViewTotal.request === null ? performance.eventA + performance.eventB + performance.eventC + performance.eventD + performance.eventE + performance.eventH + performance.eventI + performance.eventJ : this.signViewTotal.request + performance.eventA + performance.eventB + performance.eventC + performance.eventD + performance.eventE + performance.eventH + performance.eventI + performance.eventJ;
        }
        if (!processed || this.signViewTotal.response === null) {
          this.signViewTotal.response = this.signViewTotal.response === null ? performance.eventI + performance.eventJ : this.signViewTotal.response + performance.eventI + performance.eventJ;
        }
        if (!processed || this.signViewTotal.request === null) {
          this.signViewTotal.impression = this.signViewTotal.impression === null ? performance.impression : this.signViewTotal.impression + performance.impression;
        }
        if (!processed || this.signViewTotal.request === null) {
          this.signViewTotal.click = this.signViewTotal.click === null ? performance.click : this.signViewTotal.click + performance.click;
        }
        if (!processed || this.signViewTotal.request === null) {
          this.signViewTotal.cost = this.signViewTotal.cost === null ? performance.outcomeDownstream : this.signViewTotal.cost + performance.outcomeDownstream;
        }

        dateKeys.add(this.toISOStringWithTimezone(new Date(performance.time)).substring(0, 10).replace('T', ' '));
        signKeys.add(this.toISOStringWithTimezone(new Date(performance.time)).substring(0, 10).replace('T', ' ') + '|' + performance.vendorPort);
        connectionKeys.add(this.toISOStringWithTimezone(new Date(performance.time)).substring(0, 10).replace('T', ' ') + '|' + performance.clientPort + '|' + performance.vendorPort);
      }
    }

    for (const timestamp of this.timestamps) {
      if (dateKeys.has(this.toISOStringWithTimezone(new Date(timestamp)).substring(0, 10).replace('T', ' '))) {
        continue;
      }
      if (this.minTimestamp > timestamp || this.maxTimestamp < timestamp) {
        continue;
      }

      let time = '';
      if (this.signInterval === 'day') {
        time = this.toISOStringWithTimezone(new Date(timestamp)).substring(0, 10).replace('T', ' ');
      }
      if (this.signInterval === 'month') {
        time = this.toISOStringWithTimezone(new Date(timestamp)).substring(0, 7).replace('T', ' ');
      }
      if (this.signInterval === 'year') {
        time = this.toISOStringWithTimezone(new Date(timestamp)).substring(0, 4).replace('T', ' ');
      }

      const signView: BillView = {
        time: time,
        start: new Date(0),
        end: new Date(0),
        client: 0,
        clientMedia: 0,
        clientPort: 0,
        vendor: 0,
        vendorMedia: 0,
        vendorPort: 0,
        request: null,
        response: null,
        impression: null,
        click: null,
        cost: null,
        status: SignStatus.SIGN_STATUS_IGNORE,
        closed: 0,
        total: 0,
      };

      this.signViewData.push(signView);
      this.signViewMap.set(time + '|', signView);
    }

    this.dataSource.data = this.signViewData.sort((a, b) => {
      const keya = a.time + '|' + a.clientPort + '|' + a.vendorPort;
      const keyb = b.time + '|' + b.clientPort + '|' + b.vendorPort;
      return keya > keyb ? -1 : 1;
    });
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
    this.dataSource.sortingDataAccessor = (item, property) => {
      switch (property) {
        case 'gfr': return item.request ? (1.0 * (item.response ?? 0) / item.request) : -1;
        case 'er': return item.response ? (1.0 * (item.impression ?? 0) / item.response) : -1;
        case 'ctr': return item.impression ? (1.0 * (item.click ?? 0) / item.impression) : -1;
        case 'rv': return item.request ? (1.0 * (item.cost ?? 0) / item.request / 10) : -1;
        case 'cpm': return item.impression ? (1.0 * (item.cost ?? 0) / 100 / item.impression) : -1;
        case 'client': return this.clientPortMap.get(item.clientPort)?.client.name ?? '';
        case 'clientport': return this.clientPortMap.get(item.clientPort)?.name ?? '';
        case 'vendor': return this.vendorPortMap.get(item.vendorPort)?.vendor.name ?? '';
        case 'vendorport': return this.vendorPortMap.get(item.vendorPort)?.name ?? '';
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

  updateSignViewSub() {
    this.signViewDataSub.length = 0;
    this.signViewMapSub.clear();

    const signSubKeys = new Set<string>();
    for (const medium of this.mediumData) {
      let time = '';
      if (this.signInterval === 'day') {
        time = this.toISOStringWithTimezone(new Date(medium.date)).substring(0, 10).replace('T', ' ');
      }
      if (this.signInterval === 'month') {
        time = this.toISOStringWithTimezone(new Date(medium.date)).substring(0, 7).replace('T', ' ');
      }
      if (this.signInterval === 'year') {
        time = this.toISOStringWithTimezone(new Date(medium.date)).substring(0, 4).replace('T', ' ');
      }

      if (this.expandedRow!.client !== 0 && (this.clientPortMap.get(medium.clientPort)?.client.id ?? 0) !== this.expandedRow!.client) {
        continue;
      }
      if (this.expandedRow!.clientMedia !== 0 && (this.clientPortMap.get(medium.clientPort)?.clientMedia.id ?? 0) !== this.expandedRow!.clientMedia) {
        continue;
      }
      if (this.expandedRow!.clientPort !== 0 && medium.clientPort !== this.expandedRow!.clientPort) {
        continue;
      }
      if (this.expandedRow!.vendor !== 0 && (this.vendorPortMap.get(medium.vendorPort)?.vendor.id ?? 0) !== this.expandedRow!.vendor) {
        continue;
      }
      if (this.expandedRow!.vendorMedia !== 0 && (this.vendorPortMap.get(medium.vendorPort)?.vendorMedia.id ?? 0) !== this.expandedRow!.vendorMedia) {
        continue;
      }
      if (this.expandedRow!.vendorPort !== 0 && medium.vendorPort !== this.expandedRow!.vendorPort) {
        continue;
      }
      if (this.expandedRow!.time !== time) {
        continue;
      }

      let key = time + '|';
      if (this.signAggregateUpstream === 'client' || this.signAggregateUpstream === 'clientport') {
        key += 'C' + this.clientPortMap.get(medium.clientPort)?.client.id + '|';
      }
      if (this.signAggregateUpstream === 'clientport') {
        key += 'CP' + medium.clientPort + '|';
      }

      if (!this.signViewMapSub.has(key)) {
        const signView: BillView = {
          time: time,
          start: new Date(medium.date),
          end: new Date(medium.date),
          client: this.signAggregateUpstream === 'client' || this.signAggregateUpstream === 'clientport' ? this.clientPortMap.get(medium.clientPort)?.client.id ?? 0 : 0,
          clientMedia: this.signAggregateUpstream === 'clientport' ? this.clientPortMap.get(medium.clientPort)?.clientMedia.id ?? 0 : 0,
          clientPort: this.signAggregateUpstream === 'clientport' ? medium.clientPort : 0,
          vendor: this.signAggregateDownstream === 'vendor' || this.signAggregateDownstream === 'vendorport' ? this.vendorPortMap.get(medium.vendorPort)?.vendor.id ?? 0 : 0,
          vendorMedia: this.signAggregateDownstream === 'vendorport' ? this.vendorPortMap.get(medium.vendorPort)?.vendorMedia.id ?? 0 : 0,
          vendorPort: this.signAggregateDownstream === 'vendorport' ? medium.vendorPort : 0,
          request: null,
          response: null,
          impression: null,
          click: null,
          cost: null,
          status: SignStatus.SIGN_STATUS_PENDING,
          closed: 0,
          total: 0,
        }

        this.signViewDataSub.push(signView);
        this.signViewMapSub.set(key, signView);
      }

      const signView = this.signViewMapSub.get(key)!;
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
      signView.total++;

      signSubKeys.add(this.toISOStringWithTimezone(new Date(medium.date)).substring(0, 10).replace('T', ' ') + '|' + medium.clientPort + '|' + medium.vendorPort);
    }

    for (const performance of this.performanceData) {
      if (performance.clientPort === -1) {
        continue;
      }
      if (signSubKeys.has(this.toISOStringWithTimezone(new Date(performance.time)).substring(0, 10).replace('T', ' ') + '|' + performance.clientPort + '|' + performance.vendorPort)) {
        continue;
      }

      let time = '';
      if (this.signInterval === 'day') {
        time = this.toISOStringWithTimezone(new Date(performance.time)).substring(0, 10).replace('T', ' ');
      }
      if (this.signInterval === 'month') {
        time = this.toISOStringWithTimezone(new Date(performance.time)).substring(0, 7).replace('T', ' ');
      }
      if (this.signInterval === 'year') {
        time = this.toISOStringWithTimezone(new Date(performance.time)).substring(0, 4).replace('T', ' ');
      }

      if (this.expandedRow!.client !== 0 && (this.clientPortMap.get(performance.clientPort)?.client.id ?? 0) !== this.expandedRow!.client) {
        continue;
      }
      if (this.expandedRow!.clientMedia !== 0 && (this.clientPortMap.get(performance.clientPort)?.clientMedia.id ?? 0) !== this.expandedRow!.clientMedia) {
        continue;
      }
      if (this.expandedRow!.clientPort !== 0 && performance.clientPort !== this.expandedRow!.clientPort) {
        continue;
      }
      if (this.expandedRow!.vendor !== 0 && (this.vendorPortMap.get(performance.vendorPort)?.vendor.id ?? 0) !== this.expandedRow!.vendor) {
        continue;
      }
      if (this.expandedRow!.vendorMedia !== 0 && (this.vendorPortMap.get(performance.vendorPort)?.vendorMedia.id ?? 0) !== this.expandedRow!.vendorMedia) {
        continue;
      }
      if (this.expandedRow!.vendorPort !== 0 && performance.vendorPort !== this.expandedRow!.vendorPort) {
        continue;
      }
      if (this.expandedRow!.time !== time) {
        continue;
      }

      let key = time + '|';
      if (this.signAggregateUpstream === 'client' || this.signAggregateUpstream === 'clientport') {
        key += 'C' + this.clientPortMap.get(performance.clientPort)?.client.id + '|';
      }
      if (this.signAggregateUpstream === 'clientport') {
        key += 'CP' + performance.clientPort + '|';
      }

      if (!this.signViewMapSub.has(key)) {
        const signView: BillView = {
          time: time,
          start: new Date(performance.time),
          end: new Date(performance.time),
          client: this.signAggregateUpstream === 'client' || this.signAggregateUpstream === 'clientport' ? this.clientPortMap.get(performance.clientPort)?.client.id ?? 0 : 0,
          clientMedia: this.signAggregateUpstream === 'clientport' ? this.clientPortMap.get(performance.clientPort)?.clientMedia.id ?? 0 : 0,
          clientPort: this.signAggregateUpstream === 'clientport' ? performance.clientPort : 0,
          vendor: this.signAggregateDownstream === 'vendor' || this.signAggregateDownstream === 'vendorport' ? this.vendorPortMap.get(performance.vendorPort)?.vendor.id ?? 0 : 0,
          vendorMedia: this.signAggregateDownstream === 'vendorport' ? this.vendorPortMap.get(performance.vendorPort)?.vendorMedia.id ?? 0 : 0,
          vendorPort: this.signAggregateDownstream === 'vendorport' ? performance.vendorPort : 0,
          request: null,
          response: null,
          impression: null,
          click: null,
          cost: null,
          status: SignStatus.SIGN_STATUS_PENDING,
          closed: 0,
          total: 0,
        }

        this.signViewDataSub.push(signView);
        this.signViewMapSub.set(key, signView);
      }

      const signView = this.signViewMapSub.get(key)!;
      signView.request = signView.request === null ?
        performance.eventA + performance.eventB + performance.eventC + performance.eventD + performance.eventE +
        performance.eventF + performance.eventG + performance.eventH + performance.eventI + performance.eventJ
      : signView.request +
        performance.eventA + performance.eventB + performance.eventC + performance.eventD + performance.eventE +
        performance.eventF + performance.eventG + performance.eventH + performance.eventI + performance.eventJ;
      signView.response = signView.response === null ?
        performance.eventI + performance.eventJ
      : signView.response +
        performance.eventI + performance.eventJ;
      signView.impression = signView.impression === null ? performance.impression : signView.impression + performance.impression;
      signView.click = signView.click === null ? performance.click : signView.click + performance.click;
      signView.cost = signView.cost === null ? performance.outcomeDownstream : signView.cost + performance.outcomeDownstream;
      signView.total++;
    }

    this.signViewDataSub = Array.from(this.signViewMapSub.values()).sort((a, b) => {
      const keya = a.cost ?? 0;
      const keyb = b.cost ?? 0;
      return keya > keyb ? -1 : 1;
    });
    this.dataSourceSub.data = this.signViewDataSub;
  }

  updatebSignViewDataSelectedStatus() {
    if (this.signViewDataSelected.length === 0) {
      this.signViewFullySigned = false;
      this.signViewFullyCreated = false;
      this.signViewFullyReady = false;
      this.signViewFullyPending = false;
    } else {
      this.signViewFullySigned = true;
      this.signViewFullyCreated = true;
      this.signViewFullyReady = true;
      this.signViewFullyPending = true;
      for (const signView of this.signViewDataSelected) {
        if (signView.status === SignStatus.SIGN_STATUS_PENDING) {
          this.signViewFullySigned = false;
          this.signViewFullyCreated = false;
          this.signViewFullyReady = false;
        }
        if (signView.status === SignStatus.SIGN_STATUS_READY) {
          this.signViewFullySigned = false;
          this.signViewFullyCreated = false;
          this.signViewFullyPending = false;
        }
        if (signView.status === SignStatus.SIGN_STATUS_CREATED) {
          this.signViewFullySigned = false;
          this.signViewFullyReady = false;
          this.signViewFullyPending = false;
        }
        if (signView.status === SignStatus.SIGN_STATUS_SIGNED) {
          this.signViewFullyCreated = false;
          this.signViewFullyReady = false;
          this.signViewFullyPending = false;
        }
      }
    }
  }

  checkAll() {
    if (this.signViewDataSelected.length < this.signViewData.length) {
      this.signViewDataSelected = [...this.signViewData];
      this.updatebSignViewDataSelectedStatus();
    } else {
      this.signViewDataSelected = [];
      this.updatebSignViewDataSelectedStatus();
    }
  }

  checkOne(row: BillView) {
    const index = this.signViewDataSelected.indexOf(row);
    if (index >= 0) {
      this.signViewDataSelected.splice(index, 1);
      this.updatebSignViewDataSelectedStatus();
    } else {
      this.signViewDataSelected.push(row);
      this.updatebSignViewDataSelectedStatus();
    }
  }

  create() {
    if (this.signViewDataSelected.length !== 1 || this.signViewDataSelected[0].status !== SignStatus.SIGN_STATUS_PENDING && this.signViewDataSelected[0].status !== SignStatus.SIGN_STATUS_READY) {
      return;
    }

    const sign: Sign = {
      date: this.toISOStringWithTimezone(this.signViewDataSelected[0].start),
      tagId: this.clientPortMap.get(this.signViewDataSelected[0].clientPort)?.tagId.split('|')[0] ?? '',
      vendorPort: this.signViewDataSelected[0].vendorPort,
      request: this.signViewDataSelected[0].request,
      response: this.signViewDataSelected[0].response,
      impression: this.signViewDataSelected[0].impression,
      click: this.signViewDataSelected[0].click,
      cost: this.signViewDataSelected[0].cost,
      status: this.signViewDataSelected[0].status,
    };

    const mediums = this.mediumData.filter(medium => medium.vendorPort === this.signViewDataSelected[0].vendorPort && this.toISOStringWithTimezone(new Date(medium.date)).substring(0, 10).replace('T', ' ') === this.signViewDataSelected[0].time);
    const performances = this.performanceData.filter(performance => performance.vendorPort === this.signViewDataSelected[0].vendorPort && this.toISOStringWithTimezone(new Date(performance.time)).substring(0, 10).replace('T', ' ') === this.signViewDataSelected[0].time);

    const dialogRef = this.dialog.open<SignDialogComponent, SignDialogData>(SignDialogComponent, {
      data: {
        vendor: this.vendorPortMap.get(this.signViewDataSelected[0].vendorPort)!.vendor!,
        vendorPort: this.vendorPortMap.get(this.signViewDataSelected[0].vendorPort)!,
        date: this.signViewDataSelected[0].start,
        action: 'create',
        mode: String(this.mode()),
        signs: this.signViewDataSelected[0].status === 1 ? [sign] : [],
        mediums: mediums,
        performances: performances,
      },
      maxWidth: '80vw',
      maxHeight: '80vh',
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.billAPI.addSignList(result).subscribe(() => {
          this.snackBar.open('账单已创建', '关闭', {
            duration: 2000,
          });

          this.query();
        });
      }
    });
  }

  edit() {
    if (this.signViewDataSelected.length !== 1 || this.signViewDataSelected[0].status !== SignStatus.SIGN_STATUS_CREATED) {
      return;
    }

    const sign: Sign = {
      date: this.toISOStringWithTimezone(this.signViewDataSelected[0].start),
      tagId: this.clientPortMap.get(this.signViewDataSelected[0].clientPort)?.tagId.split('|')[0] ?? '',
      vendorPort: this.signViewDataSelected[0].vendorPort,
      request: this.signViewDataSelected[0].request,
      response: this.signViewDataSelected[0].response,
      impression: this.signViewDataSelected[0].impression,
      click: this.signViewDataSelected[0].click,
      cost: this.signViewDataSelected[0].cost,
      status: this.signViewDataSelected[0].status,
    };

    const mediums = this.mediumData.filter(medium => medium.vendorPort === this.signViewDataSelected[0].vendorPort && this.toISOStringWithTimezone(new Date(medium.date)).substring(0, 10).replace('T', ' ') === this.signViewDataSelected[0].time);
    const performances = this.performanceData.filter(performance => performance.vendorPort === this.signViewDataSelected[0].vendorPort && this.toISOStringWithTimezone(new Date(performance.time)).substring(0, 10).replace('T', ' ') === this.signViewDataSelected[0].time);

    const dialogRef = this.dialog.open<SignDialogComponent, SignDialogData>(SignDialogComponent, {
      data: {
        vendor: this.vendorPortMap.get(this.signViewDataSelected[0].vendorPort)!.vendor!,
        vendorPort: this.vendorPortMap.get(this.signViewDataSelected[0].vendorPort)!,
        date: this.signViewDataSelected[0].start,
        action: 'edit',
        mode: String(this.mode()),
        signs: [sign],
        mediums: mediums,
        performances: performances,
      },
      maxWidth: '80vw',
      maxHeight: '80vh',
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.billAPI.addSignList(result).subscribe(() => {
          this.snackBar.open('账单已更新', '关闭', {
            duration: 2000,
          });

          this.query();
        });
      }
    });
  }

  sign() {
    if (this.signViewDataSelected.length === 0) {
      return;
    }

    const signs: Sign[] = [];
    for (const signView of this.signViewDataSelected) {
      const sign: Sign = {
        date: this.toISOStringWithTimezone(signView.start),
        tagId: this.vendorPortMap.get(signView.vendorPort)?.tagId ?? '',
        vendorPort: signView.vendorPort,
        request: signView.request,
        response: signView.response,
        impression: signView.impression,
        click: signView.click,
        cost: signView.cost,
        status: SignStatus.SIGN_STATUS_SIGNED,
      };

      signs.push(sign);
    }

    this.billAPI.signSignList(signs).subscribe(result => {
      this.snackBar.open(result.length + '条账单账单已签发', '关闭', {
        duration: 2000,
      });

      this.query();
    });
  }

  revoke() {
    if (this.signViewDataSelected.length === 0) {
      return;
    }

    const signs: Sign[] = [];
    for (const signView of this.signViewDataSelected) {
      const sign: Sign = {
        date: this.toISOStringWithTimezone(signView.start),
        tagId: this.vendorPortMap.get(signView.vendorPort)?.tagId ?? '',
        vendorPort: signView.vendorPort,
        request: signView.request,
        response: signView.response,
        impression: signView.impression,
        click: signView.click,
        cost: signView.cost,
        status: SignStatus.SIGN_STATUS_CREATED,
      };

      signs.push(sign);
    }

    this.billAPI.revokeSignList(signs).subscribe(result => {
      this.snackBar.open(result.length + '条账单账单已撤回', '关闭', {
        duration: 2000,
      });

      this.query();
    });
  }

  stage() {
    if (this.signViewDataSelected.length === 0) {
      return;
    }

    const signs: Sign[] = [];
    for (const signView of this.signViewDataSelected) {
      const sign: Sign = {
        date: this.toISOStringWithTimezone(signView.start),
        tagId: this.clientPortMap.get(signView.clientPort)?.tagId.split('|')[0] ?? '',
        vendorPort: signView.vendorPort,
        request: signView.request,
        response: signView.response,
        impression: signView.impression,
        click: signView.click,
        cost: signView.cost,
        status: signView.status,
      };

      signs.push(sign);
    }

    const mediums = this.mediumData.filter(medium =>
      this.signViewDataSelected.map(s => s.vendorPort).indexOf(medium.vendorPort) >= 0
      &&
      this.toISOStringWithTimezone(new Date(medium.date)).substring(0, 10).replace('T', ' ') >= this.signViewDataSelected.map(s => s.time).reduce((a, b) => a < b ? a : b)
      &&
      this.toISOStringWithTimezone(new Date(medium.date)).substring(0, 10).replace('T', ' ') <= this.signViewDataSelected.map(s => s.time).reduce((a, b) => a < b ? b : a)
    );
    const performances = this.performanceData.filter(performance =>
      this.signViewDataSelected.map(s => s.vendorPort).indexOf(performance.vendorPort) >= 0
      &&
      this.toISOStringWithTimezone(new Date(performance.time)).substring(0, 10).replace('T', ' ') >= this.signViewDataSelected.map(s => s.time).reduce((a, b) => a < b ? a : b)
      &&
      this.toISOStringWithTimezone(new Date(performance.time)).substring(0, 10).replace('T', ' ') <= this.signViewDataSelected.map(s => s.time).reduce((a, b) => a < b ? b : a)
    );

    const dialogRef = this.dialog.open<SignDialogComponent, SignDialogData>(SignDialogComponent, {
      data: {
        vendor: this.vendorPortMap.get(this.signViewDataSelected[0].vendorPort)!.vendor!,
        vendorPort: this.vendorPortMap.get(this.signViewDataSelected[0].vendorPort)!,
        date: this.signViewDataSelected[0].start,
        action: 'stage',
        mode: String(this.mode()),
        signs: signs,
        mediums: mediums,
        performances: performances,
      },
      maxWidth: '80vw',
      maxHeight: '80vh',
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.billAPI.addSignList(result).subscribe(() => {
          this.snackBar.open(result.length + '条账单已创建', '关闭', {
            duration: 2000,
          });

          this.query();
        });
      }
    });
  }

  onTableScroll(event: Event) {
    this.tableWidth = this.table!.nativeElement.clientWidth;
    if (this.displayedColumnsWidth > this.tableWidth) {
      this.scrollLeft = (event.target as HTMLElement).scrollLeft;
      this.scrollRight = (this.displayedColumnsWidth - this.tableWidth) - (event.target as HTMLElement).scrollLeft;
    }
  }

  @HostListener('window:resize')
  onResize() {
    this.tableWidth = this.table!.nativeElement.clientWidth;
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
