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

import { Bill, BillAPI, BillStatus, BillView, BillViewStatus, Client, ClientAPI, ClientMedia, ClientMediaAPI, ClientPort, ClientPortAPI, ConnectionAPI, Medium, PartnerType, PerformanceAPI, PerformancePartner, PerformancePlaceholder, PerformanceView, PortType, Query, TimedPairedVendorPortMap, Vendor, VendorAPI, VendorMedia, VendorMediaAPI, VendorPort, VendorPortAPI } from '../../../../core';
import { TenantService } from '../../../../services';
import { AdEntityComponent, ConfirmDialogComponent, FilteredSelectClientComponent, FilteredSelectClientMediaComponent } from '../../../../shared';
import { ClientPortDialogComponent, ClientPortDialogData } from '../clientport-dialog/clientport-dialog.component';
import { VendorPortDialogComponent, VendorPortDialogData } from '../vendorport-dialog/vendorport-dialog.component';
import { BillDialogComponent, BillDialogData } from '../bill-dialog/bill-dialog.component';

@Component({
  selector: 'carambola-bill',
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
    AdEntityComponent,
  ],
  templateUrl: './bill.component.html',
  styleUrls: ['./bill.component.scss'],
  animations: [
    trigger('detailExpand', [
      state('collapsed, void', style({height: '0px', visibility: 'hidden'})),
      state('expanded', style({height: '*', visibility: 'visible'})),
      transition('expanded <=> collapsed, void <=> *', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ],
})
export class BillComponent implements OnInit, AfterViewInit, DoCheck {
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

  PartnerType = PartnerType;
  BillViewStatus = BillViewStatus;

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

  billAggregateUpstream = 'all';
  billAggregateDownstream = 'all';
  billStatusFilter = [BillViewStatus.BILL_STATUS_UNBILLED, BillViewStatus.BILL_STATUS_BILLED];
  billInterval = 'day';
  billStart = new Date();
  billEnd = new Date();

  timestamps: Date[] = [];
  minTimestamp: Date = new Date();
  maxTimestamp: Date = new Date();
  billData: Bill[] = [];
  connectionData: TimedPairedVendorPortMap = {};
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
  mediumData: Medium[] = [];
  performanceData: PerformancePartner[] = [];
  performanceViewData: PerformanceView[] = [];
  performanceViewMap: Map<string, PerformanceView> = new Map<string, PerformanceView>();
  billViewDataSub: BillView[] = [];
  billViewMapSub: Map<string, BillView> = new Map<string, BillView>();

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
      'client': [[], null],
      'clientMedia': [[], null],
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

        if (this.billInterval === 'day') {
          if (this.range.value.start && this.range.value.end) {
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
          if (this.range.value.start && this.range.value.end) {
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
          if (this.range.value.start && this.range.value.end) {
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

        return forkJoin([
          this.billAPI.getBillList(
            this.billInterval,
            this.toISOStringWithTimezone(this.billStart),
            this.toISOStringWithTimezone(this.billEnd),
            query
          ),
          this.performanceAPI.getPerformanceClientList(
            this.billInterval,
            false,
            this.toISOStringWithTimezone(this.billStart),
            this.toISOStringWithTimezone(this.billEnd),
            query
          ),
          this.connectionAPI.getPairedVendorPortMap(
            this.toISOStringWithTimezone(this.billStart),
            this.toISOStringWithTimezone(this.billEnd),
            query
          ),
        ]).pipe(
          catchError(() => {
            return scheduled([[], [], []], asyncScheduler);
          })
        );
      }),
    ).subscribe(results => {
      this.billData = results[0];
      this.performanceData = results[1];
      this.connectionData = results[2];
      this.prepareTimestampList();
      this.updateBillView();
    });

    this.dataRequestSub$.pipe(
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

        if (this.billInterval === 'day') {
          if (this.range.value.start && this.range.value.end) {
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
          if (this.range.value.start && this.range.value.end) {
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
          if (this.range.value.start && this.range.value.end) {
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

        return this.billAPI.getMediumListClient(
          this.billInterval,
          this.toISOStringWithTimezone(this.expandedRow!.start),
          this.toISOStringWithTimezone(this.expandedRow!.end),
          query
        ).pipe(
          catchError(() => {
            return scheduled([], asyncScheduler);
          })
        );
      }),
    ).subscribe(result => {
      this.mediumData = result;
      this.loading = false;
      this.updateBillViewSub();
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
        if (this.formGroupQuery.value.mode.indexOf(PortType.PORT_TYPE_DIRECT) < 0) {
          this.formGroupQuery.controls['mode'].setValue([]);
        }
        this.filterMode = new Map([
          ['3', '直通模式'],
        ]);
      }
      if (this.mode() === PartnerType.PARTNER_TYPE_PROGRAMMATIC) {
        if (this.formGroupQuery.value.mode.indexOf(PortType.PORT_TYPE_DIRECT) >= 0) {
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

    this.billViewDataSub.length = 0;
    this.billViewMapSub.clear();
    this.dataSourceSub.data = [];
    this.loading = true;

    this.formQuerySub = {
      filter: {
        clientMode: [String(this.mode())],
        vendorMode: [String(this.mode())],
        client: this.expandedRow.client !== 0 ? [String(this.expandedRow.client)] : this.formQuery.filter?.client,
        vendor: this.expandedRow.vendor !== 0 ? [String(this.expandedRow.vendor)] : this.formQuery.filter?.vendor,
        clientMedia: this.expandedRow.clientMedia !== 0 ? [String(this.expandedRow.clientMedia)] : this.formQuery.filter?.clientMedia,
        vendorMedia: this.expandedRow.vendorMedia !== 0 ? [String(this.expandedRow.vendorMedia)] : this.formQuery.filter?.vendorMedia,
        clientPort: this.expandedRow.clientPort !== 0 ? [String(this.expandedRow.clientPort)] : this.formQuery.filter?.clientPort,
        vendorPort: this.expandedRow.vendorPort !== 0 ? [String(this.expandedRow.vendorPort)] : this.formQuery.filter?.vendorPort,
      },
      searchKey: this.formQuery.searchKey,
      searchValue: this.formQuery.searchValue,
    };

    this.dataRequestSub$.next(this.formQuerySub);
  }

  query() {
    this.formQuery = {
      filter: {
        clientMode: [String(this.mode())],
        vendorMode: [String(this.mode())],
        client: (this.formGroupQuery.value.client as Client[]).map(client => client.id!.toString()),
        clientMedia: (this.formGroupQuery.value.clientMedia as ClientMedia[]).map(clientMedia => clientMedia.id!.toString()),
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

    if (this.billInterval === 'day') {
      if (this.range.value.start && this.range.value.end) {
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
      if (this.range.value.start && this.range.value.end) {
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
      if (this.range.value.start && this.range.value.end) {
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

  clear(event: Event, field: string, value: string | unknown[]) {
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

  changeBillAggregateDownstream(event: MatButtonToggleChange) {
    if (event.value !== this.billAggregateDownstream) {
      this.billAggregateDownstream = event.value;
      if (this.expandedRow) {
        this.updateBillViewSub();
      }
    }
  }

  changeBillStatus(event: MatButtonToggleChange) {
    this.billStatusFilter = event.value;
    this.updateBillView();
  }

  prepareDisplayColumns() {
    this.displayedColumns = ['expand', 'time'];
    this.displayedColumnsWidth = 80 + 250;
    if (this.billAggregateUpstream === 'client' || this.billAggregateUpstream === 'clientport') {
      this.displayedColumns.push('partner');
      // time column is 120px when partner column exists
      this.displayedColumnsWidth = this.displayedColumnsWidth - 250 + 120 + 250;
    }
    this.displayedColumns = [...this.displayedColumns, ...this.formGroupColumn.value.column, 'actions'];
    this.displayedColumnsWidth = this.displayedColumnsWidth + this.formGroupColumn.value.column.length * 120 + 80;

    this.onResize();
  }

  prepareTimestampList() {
    this.timestamps = [];

    for (let t = this.billEnd.getTime(); t >= this.billStart.getTime();) {
      const date = new Date(t);
      if (this.billInterval === 'day') {
        date.setMilliseconds(0);
        date.setSeconds(0);
        date.setMinutes(0);
        date.setHours(0);
      }
      if (this.billInterval === 'month') {
        date.setMilliseconds(0);
        date.setSeconds(0);
        date.setMinutes(0);
        date.setHours(0);
        date.setDate(1);
      }
      if (this.billInterval === 'year') {
        date.setMilliseconds(0);
        date.setSeconds(0);
        date.setMinutes(0);
        date.setHours(0);
        date.setDate(1);
        date.setMonth(0);
      }

      this.timestamps.push(date);
      t = date.getTime();

      if (this.billInterval === 'day') {
        t = t - 86400000;
      }
      if (this.billInterval === 'month') {
        const date = new Date(t);
        date.setMonth(date.getMonth() - 1);
        t = date.getTime();
      }
      if (this.billInterval === 'year') {
        const date = new Date(t);
        date.setFullYear(date.getFullYear() - 1);
        t = date.getTime();
      }
    }
  }

  updateBillView() {
    this.expandedRow = null;
    this.billViewDataSelected = [];
    this.updatebBillViewDataSelectedStatus();

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

    const dateKeys = new Set<string>();
    const billKeys = new Set<string>();
    const connectionKeys = new Set<string>();

    this.billViewData.length = 0;
    this.billViewMap.clear();
    for (const bill of this.billData) {
      if (this.minTimestamp > new Date(bill.date)) {
        this.minTimestamp = new Date(bill.date);
      }
      if (this.maxTimestamp < new Date(bill.date)) {
        this.maxTimestamp = new Date(bill.date);
      }

      if (this.billAggregateUpstream !== 'clientport' || this.billInterval !== 'day' || this.billStatusFilter.indexOf(BillViewStatus.BILL_STATUS_BILLED) >= 0) {
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

      dateKeys.add(this.toISOStringWithTimezone(new Date(bill.date)).substring(0, 10).replace('T', ' '));
      billKeys.add(this.toISOStringWithTimezone(new Date(bill.date)).substring(0, 10).replace('T', ' ') + '|' + bill.clientPort);
    }

    this.performanceViewData.length = 0;
    this.performanceViewMap.clear();
    for (const performance of this.performanceData) {
      if (this.minTimestamp > new Date(performance.time)) {
        this.minTimestamp = new Date(performance.time);
      }
      if (this.maxTimestamp < new Date(performance.time)) {
        this.maxTimestamp = new Date(performance.time);
      }

      let time = '';
      if (this.billInterval === 'day') {
        time = this.toISOStringWithTimezone(new Date(performance.time)).substring(0, 10).replace('T', ' ');
      }
      if (this.billInterval === 'month') {
        time = this.toISOStringWithTimezone(new Date(performance.time)).substring(0, 7).replace('T', ' ');
      }
      if (this.billInterval === 'year') {
        time = this.toISOStringWithTimezone(new Date(performance.time)).substring(0, 4).replace('T', ' ');
      }

      let key = time + '|';
      if (this.billAggregateUpstream === 'client' || this.billAggregateUpstream === 'clientport') {
        key += 'C' + this.clientPortMap.get(performance.clientPort)?.client.id + '|';
      }
      if (this.billAggregateUpstream === 'clientport') {
        key += 'CP' + performance.clientPort + '|';
      }

      if (!this.performanceViewMap.has(key)) {
        const performanceView: PerformanceView = {
          time: time,
          start: new Date(performance.time),
          end: new Date(performance.time),
          client: this.billAggregateUpstream === 'client' || this.billAggregateUpstream === 'clientport'
            ? performance.clientPort === -1 ?
                -1
                :
                this.clientPortMap.get(performance.clientPort)?.client.id
                  ?? 0
            : 0,
          clientMedia: this.billAggregateUpstream === 'clientport'
            ? performance.clientPort === -1 ?
                -1
                :
                this.clientPortMap.get(performance.clientPort)?.clientMedia.id
                  ?? 0
            : 0,
          clientPort: this.billAggregateUpstream === 'clientport' ? performance.clientPort : 0,
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

      if (this.billAggregateUpstream !== 'clientport' || this.billInterval !== 'day' || this.billStatusFilter.indexOf(BillViewStatus.BILL_STATUS_UNBILLED) >= 0) {
        if (billKeys.has(this.toISOStringWithTimezone(new Date(performance.time)).substring(0, 10).replace('T', ' ') + '|' + performance.clientPort)) {
          continue;
        }

        if (!this.billViewMap.has(key)) {
          const billView: BillView = {
            time: time,
            start: new Date(performance.time),
            end: new Date(performance.time),
            client: this.billAggregateUpstream === 'client' || this.billAggregateUpstream === 'clientport' ? this.clientPortMap.get(performance.clientPort)?.client.id ?? 0 : 0,
            clientMedia: this.billAggregateUpstream === 'clientport' ? this.clientPortMap.get(performance.clientPort)?.clientMedia.id ?? 0 : 0,
            clientPort: this.billAggregateUpstream === 'clientport' ? performance.clientPort : 0,
            vendor: 0,
            vendorMedia: 0,
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

          this.billViewData.push(billView);
          this.billViewMap.set(key, billView);
        }

        if (!connectionKeys.has(this.toISOStringWithTimezone(new Date(performance.time)).substring(0, 10).replace('T', ' ') + '|' + performance.clientPort + '|' + performance.vendorPort)) {
          const billView = this.billViewMap.get(key)!;
          billView.total++;
        }
      }

      dateKeys.add(this.toISOStringWithTimezone(new Date(performance.time)).substring(0, 10).replace('T', ' '));
      billKeys.add(this.toISOStringWithTimezone(new Date(performance.time)).substring(0, 10).replace('T', ' ') + '|' + performance.clientPort);
      connectionKeys.add(this.toISOStringWithTimezone(new Date(performance.time)).substring(0, 10).replace('T', ' ') + '|' + performance.clientPort + '|' + performance.vendorPort);
    }

    if (this.billAggregateUpstream !== 'clientport' || this.billInterval !== 'day' || this.billStatusFilter.indexOf(BillViewStatus.BILL_STATUS_UNBILLED) >= 0) {
      for (const dateKey of Object.keys(this.connectionData)) {
        const date = parseInt(dateKey);
        const clientPortList = this.connectionData[date];

        if (this.minTimestamp > new Date(date)) {
          this.minTimestamp = new Date(date);
        }
        if (this.maxTimestamp < new Date(date)) {
          this.maxTimestamp = new Date(date);
        }

        let time = '';
        if (this.billInterval === 'day') {
          time = this.toISOStringWithTimezone(new Date(date)).substring(0, 10).replace('T', ' ');
        }
        if (this.billInterval === 'month') {
          time = this.toISOStringWithTimezone(new Date(date)).substring(0, 7).replace('T', ' ');
        }
        if (this.billInterval === 'year') {
          time = this.toISOStringWithTimezone(new Date(date)).substring(0, 4).replace('T', ' ');
        }

        for (const clientPortKey of Object.keys(clientPortList)) {
          const clientPort = parseInt(clientPortKey);
          const pairedVendorPortList = clientPortList[clientPort];
          for (const vendorPort of pairedVendorPortList) {
            if (billKeys.has(this.toISOStringWithTimezone(new Date(date)).substring(0, 10).replace('T', ' ') + '|' + clientPort)) {
              continue;
            }
            if (connectionKeys.has(this.toISOStringWithTimezone(new Date(date)).substring(0, 10).replace('T', ' ') + '|' + clientPort + '|' + vendorPort)) {
              continue;
            }

            let key = time + '|';
            if (this.billAggregateUpstream === 'client' || this.billAggregateUpstream === 'clientport') {
              key += 'C' + this.clientPortMap.get(clientPort)?.client.id + '|';
            }
            if (this.billAggregateUpstream === 'clientport') {
              key += 'CP' + clientPort + '|';
            }

            if (!this.billViewMap.has(key)) {
              const billView: BillView = {
                time: time,
                start: new Date(date),
                end: new Date(date),
                client: this.billAggregateUpstream === 'client' || this.billAggregateUpstream === 'clientport' ? this.clientPortMap.get(clientPort)?.client.id ?? 0 : 0,
                clientMedia: this.billAggregateUpstream === 'clientport' ? this.clientPortMap.get(clientPort)?.clientMedia.id ?? 0 : 0,
                clientPort: this.billAggregateUpstream === 'clientport' ? clientPort : 0,
                vendor: 0,
                vendorMedia: 0,
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

              this.billViewData.push(billView);
              this.billViewMap.set(key, billView);
            }

            if (!connectionKeys.has(this.toISOStringWithTimezone(new Date(date)).substring(0, 10).replace('T', ' ') + '|' + clientPort + '|' + vendorPort)) {
              const billView = this.billViewMap.get(key)!;
              billView.total++;
            }

            dateKeys.add(this.toISOStringWithTimezone(new Date(date)).substring(0, 10).replace('T', ' '));
            billKeys.add(this.toISOStringWithTimezone(new Date(date)).substring(0, 10).replace('T', ' ') + '|' + clientPort);
            connectionKeys.add(this.toISOStringWithTimezone(new Date(date)).substring(0, 10).replace('T', ' ') + '|' + clientPort + '|' + vendorPort);
          }
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
        if (this.billInterval === 'day') {
          time = this.toISOStringWithTimezone(new Date(timestamp)).substring(0, 10).replace('T', ' ');
        }
        if (this.billInterval === 'month') {
          time = this.toISOStringWithTimezone(new Date(timestamp)).substring(0, 7).replace('T', ' ');
        }
        if (this.billInterval === 'year') {
          time = this.toISOStringWithTimezone(new Date(timestamp)).substring(0, 4).replace('T', ' ');
        }

        let key = time + '|';
        if (this.billAggregateUpstream === 'client' || this.billAggregateUpstream === 'clientport') {
          key += 'C' + 0 + '|';
        }
        if (this.billAggregateUpstream === 'clientport') {
          key += 'CP' + 0 + '|';
        }

        const billView: BillView = {
          time: time,
          start: new Date(timestamp),
          end: new Date(timestamp),
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
          status: BillStatus.BILL_STATUS_PENDING,
          closed: 0,
          total: 0,
        };

        this.billViewData.push(billView);
        this.billViewMap.set(key, billView);
      }
    }

    this.dataSource.data = this.billViewData.sort((a, b) => {
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

  updateBillViewSub() {
    this.billViewDataSub.length = 0;
    this.billViewMapSub.clear();

    const billViewDataUpstream: BillView = {
      time: '上游成本',
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
      total: 0
    };
    const billViewDataRebate: BillView = {
      time: '上游返点',
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
      total: 0
    };
    const billViewDataProfit: BillView = {
      time: '利润',
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
      total: 0
    };

    for (const medium of this.mediumData) {
      let time = '';
      if (this.billInterval === 'day') {
        time = this.toISOStringWithTimezone(new Date(medium.date)).substring(0, 10).replace('T', ' ');
      }
      if (this.billInterval === 'month') {
        time = this.toISOStringWithTimezone(new Date(medium.date)).substring(0, 7).replace('T', ' ');
      }
      if (this.billInterval === 'year') {
        time = this.toISOStringWithTimezone(new Date(medium.date)).substring(0, 4).replace('T', ' ');
      }

      let key = time + '|';
      if (this.billAggregateDownstream === 'vendor' || this.billAggregateDownstream === 'vendorport') {
        key += 'V' + this.vendorPortMap.get(medium.vendorPort)?.vendor.id + '|';
      }
      if (this.billAggregateDownstream === 'vendorport') {
        key += 'VP' + medium.vendorPort + '|';
      }

      if (!this.billViewMapSub.has(key)) {
        const billView: BillView = {
          time: time,
          start: new Date(),
          end: new Date(),
          client: 0,
          clientMedia: 0,
          clientPort: 0,
          vendor: this.billAggregateDownstream === 'vendor' || this.billAggregateDownstream === 'vendorport' ? this.vendorPortMap.get(medium.vendorPort)?.vendor.id ?? 0 : 0,
          vendorMedia: this.billAggregateDownstream === 'vendorport' ? this.vendorPortMap.get(medium.vendorPort)?.vendorMedia.id ?? 0 : 0,
          vendorPort: this.billAggregateDownstream === 'vendorport' ? medium.vendorPort : 0,
          request: null,
          response: null,
          impression: null,
          click: null,
          cost: null,
          status: BillStatus.BILL_STATUS_IGNORE,
          closed: 0,
          total: 0,
        };

        this.billViewDataSub.push(billView);
        this.billViewMapSub.set(key, billView);
      }

      const billView = this.billViewMapSub.get(key)!;
      if (medium.request !== null) {
          billView.request = billView.request === null ? medium.request : billView.request + medium.request;
      }
      if (medium.response !== null) {
          billView.response = billView.response === null ? medium.response : billView.response + medium.response;
      }
      if (medium.impression !== null) {
          billView.impression = billView.impression === null ? medium.impression : billView.impression + medium.impression;
      }
      if (medium.click !== null) {
          billView.click = billView.click === null ? medium.click : billView.click + medium.click;
      }
      if (medium.outcomeDownstream !== null) {
          billView.cost = billView.cost === null ? medium.outcomeDownstream : billView.cost + medium.outcomeDownstream;
      }

      if (medium.outcomeUpstream !== null) {
          billViewDataUpstream.cost = billViewDataUpstream.cost === null ? medium.outcomeUpstream : billViewDataUpstream.cost + medium.outcomeUpstream;
      }
      if (medium.outcomeRebate !== null) {
          billViewDataRebate.cost = billViewDataRebate.cost === null ? medium.outcomeRebate : billViewDataRebate.cost + medium.outcomeRebate;
      }
      if (medium.income !== null && medium.outcomeUpstream !== null && medium.outcomeRebate !== null && medium.outcomeDownstream !== null) {
          billViewDataProfit.cost = billViewDataProfit.cost === null ? medium.income - medium.outcomeUpstream - medium.outcomeRebate - medium.outcomeDownstream : billViewDataProfit.cost + medium.income - medium.outcomeUpstream - medium.outcomeRebate - medium.outcomeDownstream;
      }
    }

    this.billViewDataSub = Array.from(this.billViewMapSub.values()).sort((a, b) => {
      const keya = a.cost ?? 0;
      const keyb = b.cost ?? 0;
      return keya > keyb ? -1 : 1;
    });
    if (billViewDataUpstream.cost !== null && billViewDataUpstream.cost > 0) {
      this.billViewDataSub = [...this.billViewDataSub, billViewDataUpstream];
    }
    if (billViewDataRebate.cost !== null && billViewDataRebate.cost > 0) {
      this.billViewDataSub = [...this.billViewDataSub, billViewDataRebate];
    }
    this.billViewDataSub = [...this.billViewDataSub, billViewDataProfit];
    this.dataSourceSub.data = this.billViewDataSub;
  }

  updatebBillViewDataSelectedStatus() {
    if (this.billViewDataSelected.length === 0) {
      this.billViewFullyBilled = false;
      this.billViewFullyUnbilled = false;
    } else {
      this.billViewFullyBilled = true;
      this.billViewFullyUnbilled = true;
      for (const billView of this.billViewDataSelected) {
        if (billView.status === 0) {
          this.billViewFullyBilled = false;
        } else {
          this.billViewFullyUnbilled = false;
        }
      }
    }
  }

  checkAll() {
    if (this.billViewDataSelected.length < this.billViewData.length) {
      this.billViewDataSelected = [...this.billViewData];
      this.updatebBillViewDataSelectedStatus();
    } else {
      this.billViewDataSelected = [];
      this.updatebBillViewDataSelectedStatus();
    }
  }

  checkOne(row: BillView) {
    const index = this.billViewDataSelected.indexOf(row);
    if (index >= 0) {
      this.billViewDataSelected.splice(index, 1);
      this.updatebBillViewDataSelectedStatus();
    } else {
      this.billViewDataSelected.push(row);
      this.updatebBillViewDataSelectedStatus();
    }
  }

  zero() {
    if (this.billViewDataSelected.length === 0) {
      return;
    }

    let billed = 0;
    for (const billView of this.billViewDataSelected) {
      if (billView.status !== 0) {
        billed++;
      }
    }

    if (billed > 0) {
      const dialogRef = this.dialog.open(ConfirmDialogComponent, {
        data: '有' + billed + '条账单已经存在，是否覆盖为零？',
        maxWidth: '80vw',
        maxHeight: '80vh',
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          const bills: Bill[] = [];
          for (const billView of this.billViewDataSelected) {
            const bill: Bill = {
              date: this.toISOStringWithTimezone(billView.start),
              tagId: this.clientPortMap.get(billView.clientPort)?.tagId.split('|')[0] ?? '',
              clientPort: billView.clientPort,
              request: 0,
              response: 0,
              impression: 0,
              click: 0,
              cost: 0,
              status: BillStatus.BILL_STATUS_MANUAL,
            };

            bills.push(bill);
          }

          this.billAPI.addBillList(bills).subscribe(() => {
            this.query();
          });
        }
      });
    } else {
      const bills: Bill[] = [];
      for (const billView of this.billViewDataSelected) {
        const bill: Bill = {
          date: this.toISOStringWithTimezone(billView.start),
          tagId: this.clientPortMap.get(billView.clientPort)?.tagId.split('|')[0] ?? '',
          clientPort: billView.clientPort,
          request: 0,
          response: 0,
          impression: 0,
          click: 0,
          cost: 0,
          status: BillStatus.BILL_STATUS_MANUAL,
        };

        bills.push(bill);
      }

      this.billAPI.addBillList(bills).subscribe(result => {
        this.snackBar.open(result.length + '条账单账单已补零', '关闭', {
          duration: 2000,
        });

        this.query();
      });
    }
  }

  add() {
    if (this.billViewDataSelected.length !== 1 || this.billViewDataSelected[0].status !== 0) {
      return;
    }

    const dialogRef = this.dialog.open(BillDialogComponent, {
      data: {
        client: this.clientPortMap.get(this.billViewDataSelected[0].clientPort)!.client!,
        clientPort: this.clientPortMap.get(this.billViewDataSelected[0].clientPort)!,
        date: this.billViewDataSelected[0].start,
        bill: null,
      },
      maxWidth: '80vw',
      maxHeight: '80vh',
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const bills: Bill[] = [];
        bills.push(result);

        this.billAPI.addBillList(bills).subscribe(() => {
          this.snackBar.open('账单已创建', '关闭', {
            duration: 2000,
          });

          this.query();
        });
      }
    });
  }

  remove() {
    if (this.billViewDataSelected.length === 0) {
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: '即将删除' + this.billViewDataSelected.length + '条账单，是否继续？',
      maxWidth: '80vw',
      maxHeight: '80vh',
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const bills: Bill[] = [];
        for (const billView of this.billViewDataSelected) {
          const bill: Bill = {
            date: this.toISOStringWithTimezone(billView.start),
            tagId: this.clientPortMap.get(billView.clientPort)?.tagId.split('|')[0] ?? '',
            clientPort: billView.clientPort,
            request: null,
            response: null,
            impression: null,
            click: null,
            cost: null,
            status: BillStatus.BILL_STATUS_IGNORE,
          };

          bills.push(bill);
        }

        this.billAPI.removeBillList(bills).subscribe(result => {
          this.snackBar.open(result.length + '条账单账单已撤销', '关闭', {
            duration: 2000,
          });

          this.query();
        });
      }
    });
  }

  update() {
    if (this.billViewDataSelected.length !== 1 || this.billViewDataSelected[0].status === 0) {
      return;
    }

    const bill: Bill = {
      date: this.toISOStringWithTimezone(this.billViewDataSelected[0].start),
      tagId: this.clientPortMap.get(this.billViewDataSelected[0].clientPort)?.tagId.split('|')[0] ?? '',
      clientPort: this.billViewDataSelected[0].clientPort,
      request: this.billViewDataSelected[0].request,
      response: this.billViewDataSelected[0].response,
      impression: this.billViewDataSelected[0].impression,
      click: this.billViewDataSelected[0].click,
      cost: this.billViewDataSelected[0].cost,
      status: this.billViewDataSelected[0].status,
    };

    const dialogRef = this.dialog.open<BillDialogComponent, BillDialogData>(BillDialogComponent, {
      data: {
        client: this.clientPortMap.get(this.billViewDataSelected[0].clientPort)!.client!,
        clientPort: this.clientPortMap.get(this.billViewDataSelected[0].clientPort)!,
        date: this.billViewDataSelected[0].start,
        bill: bill,
      },
      maxWidth: '80vw',
      maxHeight: '80vh',
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const bills: Bill[] = [];
        bills.push(result);

        this.billAPI.addBillList(bills).subscribe(() => {
          this.snackBar.open('账单已更新', '关闭', {
            duration: 2000,
          });

          this.query();
        });
      }
    });
  }

  getPerformanceData(row: BillView): PerformanceView | null {
    let key = row.time + '|';
    if (this.billAggregateUpstream === 'client' || this.billAggregateUpstream === 'clientport') {
      key += 'C' + row.client + '|';
    }
    if (this.billAggregateUpstream === 'clientport') {
      key += 'CP' + row.clientPort + '|';
    }

    return this.performanceViewMap.get(key) ?? null;
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
