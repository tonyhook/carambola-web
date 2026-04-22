import { AfterViewInit, Component, DoCheck, effect, ElementRef, HostListener, KeyValueDiffer, KeyValueDiffers, OnInit, signal, ViewChild, WritableSignal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleChange, MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTimepickerModule } from '@angular/material/timepicker';
import { CdkMenuModule } from '@angular/cdk/menu';
import { catchError, debounceTime, forkJoin, of, Subject, switchMap } from 'rxjs';

import { Client, ClientAPI, ClientMedia, ClientMediaAPI, ClientPort, ClientPortAPI, PartnerType, PerformanceAPI, PerformancePartner, PerformancePlaceholder, PerformanceView, PortType, Query, Vendor, VendorAPI, VendorMedia, VendorMediaAPI, VendorPort, VendorPortAPI } from '../../../../core';
import { TenantService } from '../../../../services';
import { AdEntityComponent, FilteredSelectClientComponent, FilteredSelectClientMediaComponent, FilteredSelectVendorComponent, FilteredSelectVendorMediaComponent } from '../../../../shared';
import { BundleDialogComponent } from '../bundle-dialog/bundle-dialog.component';
import { ClientPortDialogComponent, ClientPortDialogData } from '../clientport-dialog/clientport-dialog.component';
import { VendorPortDialogComponent, VendorPortDialogData } from '../vendorport-dialog/vendorport-dialog.component';

interface PerformanceColumnControls {
  column: FormControl<string[]>;
}

interface PerformanceQueryControls {
  client: FormControl<Client[]>;
  vendor: FormControl<Vendor[]>;
  clientMedia: FormControl<ClientMedia[]>;
  vendorMedia: FormControl<VendorMedia[]>;
  platform: FormControl<string[]>;
  format: FormControl<string[]>;
  budget: FormControl<string[]>;
  mode: FormControl<string[]>;
  search: FormControl<string>;
}

interface PerformanceRangeControls {
  start: FormControl<Date | null>;
  end: FormControl<Date | null>;
  time: FormControl<Date | null>;
}

@Component({
  selector: 'carambola-performance',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
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
    MatTimepickerModule,
    CdkMenuModule,
    FilteredSelectClientComponent,
    FilteredSelectClientMediaComponent,
    FilteredSelectVendorComponent,
    FilteredSelectVendorMediaComponent,
    AdEntityComponent,
  ],
  templateUrl: './performance.component.html',
  styleUrls: ['./performance.component.scss'],
  animations: [
    trigger('detailExpand', [
      state('collapsed, void', style({height: '0px', visibility: 'hidden'})),
      state('expanded', style({height: '*', visibility: 'visible'})),
      transition('expanded <=> collapsed, void <=> *', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ],
})
export class PerformanceComponent implements OnInit, AfterViewInit, DoCheck {
  private formBuilder = inject(FormBuilder);
  private tenantService = inject(TenantService);
  private clientAPI = inject(ClientAPI);
  private clientMediaAPI = inject(ClientMediaAPI);
  private clientPortAPI = inject(ClientPortAPI);
  private vendorAPI = inject(VendorAPI);
  private vendorMediaAPI = inject(VendorMediaAPI);
  private vendorPortAPI = inject(VendorPortAPI);
  private performanceAPI = inject(PerformanceAPI);
  private dialog = inject(MatDialog);
  private route = inject(ActivatedRoute);
  private readonly differs = inject(KeyValueDiffers);

  PortType = PortType;

  displayedColumns: string[] = [];
  displayedColumnsWidth = 0;
  scrollLeft = 0;
  scrollRight = 0;
  tableWidth = 0;
  candidateColumns: Map<string, string> = new Map<string, string>();
  hoverRow: PerformanceView | null = null;
  expandedRow: PerformanceView | null = null;
  loading = false;
  formGroupColumn: FormGroup<PerformanceColumnControls>;

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
  rapid: WritableSignal<boolean> = signal(false);
  direction: WritableSignal<string> = signal('none');
  formGroupQuery: FormGroup<PerformanceQueryControls>;
  filterPlatform: Map<string, string>;
  filterFormat: Map<string, string>;
  filterBudget: Map<string, string>;
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
  formQueryBundle: Query<PerformancePlaceholder> = {
    filter: {},
    searchKey: ['name', 'tagId'],
    searchValue: '',
  };
  range: FormGroup<PerformanceRangeControls>;
  differ: KeyValueDiffer<string, unknown>;
  changedByProgram = false;

  performanceAggregateUpstream = 'all';
  performanceAggregateDownstream = 'all';
  performanceInterval = 'day';
  performanceStart = new Date();
  performanceEnd = new Date();

  timestamps: Date[] = [];
  minTimestamp: Date = new Date();
  maxTimestamp: Date = new Date();
  performanceData: PerformancePartner[] = [];
  performanceViewData: PerformanceView[] = [];
  performanceViewMap: Map<string, PerformanceView> = new Map<string, PerformanceView>();
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
  performanceDataSub: PerformancePartner[] = [];
  performanceViewDataSub: PerformanceView[] = [];
  performanceViewMapSub: Map<string, PerformanceView> = new Map<string, PerformanceView>();

  @ViewChild(MatSort, {static: false}) sort: MatSort | null = null;
  @ViewChild(MatPaginator, {static: false}) paginator: MatPaginator | null = null;
  @ViewChild('table', {static: false}) table: ElementRef | null = null;

  dataRequest$ = new Subject<Query<PerformancePlaceholder>>();
  dataSource = new MatTableDataSource<PerformanceView>([]);
  dataRequestSub$ = new Subject<Query<PerformancePlaceholder>>();
  dataSourceSub = new MatTableDataSource<PerformanceView>([]);

  constructor() {
    this.formGroupColumn = this.formBuilder.group({
      column: this.formBuilder.nonNullable.control<string[]>([]),
    });
    this.formGroupQuery = this.formBuilder.group({
      client: this.formBuilder.nonNullable.control<Client[]>([]),
      vendor: this.formBuilder.nonNullable.control<Vendor[]>([]),
      clientMedia: this.formBuilder.nonNullable.control<ClientMedia[]>([]),
      vendorMedia: this.formBuilder.nonNullable.control<VendorMedia[]>([]),
      platform: this.formBuilder.nonNullable.control<string[]>([]),
      format: this.formBuilder.nonNullable.control<string[]>([]),
      budget: this.formBuilder.nonNullable.control<string[]>([]),
      mode: this.formBuilder.nonNullable.control<string[]>([]),
      search: this.formBuilder.nonNullable.control(''),
    });

    this.filterPlatform = new Map([
      ['iOS', 'iOS'],
      ['Android', 'Android'],
      ['Web', 'Web'],
    ]);
    this.filterFormat = new Map([
      ['banner', '横幅'],
      ['interstitial', '插屏'],
      ['splash', '开屏'],
      ['feeds', '信息流'],
      ['video', '视频'],
    ]);
    this.filterBudget = new Map([
      ['unknown', '未知'],
      ['k2', 'k2'],
      ['tanx', 'tanx'],
      ['jd', '京东'],
      ['qihang', '启航'],
      ['dahanghai', '大航海'],
      ['kuaishou', '快手'],
      ['pinduoduo', '拼多多'],
      ['huichuan', '汇川'],
      ['game', '游戏'],
      ['didi', '滴滴'],
      ['iqiyi', '爱奇艺'],
      ['baidu', '百度'],
      ['meituan', '美团'],
      ['juheshangcheng', '聚合电商'],
      ['mangguo', '芒果'],
    ]);
    this.filterMode = new Map([
      ['1', '分成模式'],
      ['2', '竞价模式'],
      ['3', '直通模式'],
    ]);

    this.range = this.formBuilder.group({
      start: this.formBuilder.control<Date | null>(null),
      end: this.formBuilder.control<Date | null>(null),
      time: this.formBuilder.control<Date | null>(null),
    });
    this.differ = this.differs.find(this.range.getRawValue()).create();

    effect(() => {
      const mode = this.mode();
      const tenant = this.tenantService.tenant();
      const direction = this.direction();

      this.performanceAggregateUpstream = 'all';
      this.performanceAggregateDownstream = 'all';

      if (mode === PartnerType.PARTNER_TYPE_UNKNOWN) {
        return;
      }
      if (!tenant) {
        return;
      }

      this.dataSource.data = [];
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
        this.candidateColumns.set('request', '请求');
        if (direction === 'client' || this.tenantService.isTenantManager() || this.tenantService.isTenantOperator() || this.tenantService.isTenantObserver() || this.tenantService.isManager()) {
          this.candidateColumns.set('request-valid', '有效请求');
        }
        this.candidateColumns.set('response', '响应');
        if (direction === 'client' || this.tenantService.isTenantManager() || this.tenantService.isTenantOperator() || this.tenantService.isTenantObserver() || this.tenantService.isManager()) {
          this.candidateColumns.set('response-valid', '有效响应');
        }
        this.candidateColumns.set('gfr', '填充率');
        if (direction === 'client' || this.tenantService.isTenantManager() || this.tenantService.isTenantOperator() || this.tenantService.isTenantObserver() || this.tenantService.isManager()) {
          this.candidateColumns.set('gfrv', '有效填充率');
        }
        if (direction === 'client') {
          this.candidateColumns.set('offer', '平均出价');
        }
        this.candidateColumns.set('impression', '展现');
        this.candidateColumns.set('click', '点击');
        this.candidateColumns.set('er', '展现率');
        this.candidateColumns.set('ctr', '点击率');
        if (direction === 'client' || this.tenantService.isTenantManager() || this.tenantService.isTenantOperator() || this.tenantService.isTenantObserver() || this.tenantService.isManager()) {
          this.candidateColumns.set('income', '收入');
          this.candidateColumns.set('outcome', '成本');
          this.candidateColumns.set('profit', '利润');
          this.candidateColumns.set('rv', '请求价值');
          this.candidateColumns.set('cpmu', '上游CPM');
        }
        this.candidateColumns.set('cpmd', '下游CPM');
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

  get selectedVendors(): Vendor[] {
    return this.formGroupQuery.controls.vendor.value;
  }

  get selectedClientMedias(): ClientMedia[] {
    return this.formGroupQuery.controls.clientMedia.value;
  }

  get selectedVendorMedias(): VendorMedia[] {
    return this.formGroupQuery.controls.vendorMedia.value;
  }

  get selectedPlatforms(): string[] {
    return this.formGroupQuery.controls.platform.value;
  }

  get selectedFormats(): string[] {
    return this.formGroupQuery.controls.format.value;
  }

  get selectedBudgets(): string[] {
    return this.formGroupQuery.controls.budget.value;
  }

  get selectedModes(): string[] {
    return this.formGroupQuery.controls.mode.value;
  }

  get searchValue(): string {
    return this.formGroupQuery.controls.search.value;
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
        this.prepareRange();

        return this.direction() === 'client' ?
          this.performanceAPI.getPerformanceClientList(
            this.performanceInterval,
            false,
            this.toISOStringWithTimezone(this.performanceStart),
            this.toISOStringWithTimezone(this.performanceEnd),
            query
          ).pipe(
            catchError(() => {
              return of([]);
            })
          )
        :
          this.performanceAPI.getPerformanceVendorList(
            this.performanceInterval,
            false,
            this.toISOStringWithTimezone(this.performanceStart),
            this.toISOStringWithTimezone(this.performanceEnd),
            query
          ).pipe(
            catchError(() => {
              return of([]);
            })
          );
      }),
    ).subscribe(result => {
      this.performanceData = result;
      this.prepareTimestampList();
      this.updatePerformanceView();
    });

    this.dataRequestSub$.pipe(
      debounceTime(500),
      switchMap(query => this.performanceAPI.getPerformanceClientList(
        this.performanceInterval,
        true,
        this.toISOStringWithTimezone(this.expandedRow!.start),
        this.toISOStringWithTimezone(this.expandedRow!.end),
        query
      ).pipe(
        catchError(() => {
          return of([]);
        })
      )),
    ).subscribe(result => {
      this.performanceDataSub = result;
      this.loading = false;
      this.updatePerformanceViewSub();
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

      if (params['direction']) {
        this.direction.set(params['direction'] === 'vendor' ? 'vendor' : 'client');
      } else {
        this.direction.set('client');
      }

      if (this.mode() === PartnerType.PARTNER_TYPE_DIRECT) {
        if (this.selectedModes.indexOf(String(PortType.PORT_TYPE_DIRECT)) < 0) {
          this.formGroupQuery.controls.mode.setValue([]);
        }
        this.filterMode = new Map([
          ['3', '直通模式'],
        ]);
      }
      if (this.mode() === PartnerType.PARTNER_TYPE_PROGRAMMATIC) {
        if (this.selectedModes.indexOf(String(PortType.PORT_TYPE_DIRECT)) >= 0) {
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
      if (this.changedByProgram) {
        return;
      }
      this.changedByProgram = true;

      if (this.performanceInterval === 'day' || this.performanceInterval === 'month' || this.performanceInterval === 'year') {
        if (this.range.controls.start.value && this.range.controls.end.value) {
          this.range.controls.time.setValue(null);
          this.query();
        } else {
          this.changedByProgram = false;
        }
      }
      if (this.performanceInterval === 'minute' || this.performanceInterval === 'quarter' || this.performanceInterval === 'hour') {
        let dateChanged = false;
        changes.forEachChangedItem(item => {
          if (item.key === 'start' || item.key === 'end') {
            dateChanged = true;
          }
        })
        let timeChanged = false;
        changes.forEachChangedItem(item => {
          if (item.key === 'time') {
            timeChanged = true;
          }
        });

        if (this.range.controls.time.value) {
          if (dateChanged) {
            if (this.range.controls.start.value && this.range.controls.end.value) {
              this.range.controls.time.setValue(null);
              this.query();
            } else {
              this.changedByProgram = false;
            }
          } else {
            this.range.controls.start.setValue(new Date());
            this.range.controls.end.setValue(new Date());
            this.query();
          }
        } else {
          if (timeChanged) {
            this.range.controls.start.setValue(new Date());
            this.range.controls.end.setValue(new Date());
            this.query();
          } else {
            if (this.range.controls.start.value && this.range.controls.end.value) {
              this.range.controls.time.setValue(null);
              this.query();
            } else {
              this.changedByProgram = false;
            }
          }
        }
      }
    }
  }

  mouseenter(row: PerformanceView) {
    this.hoverRow = row;
  }

  mouseleave() {
    this.hoverRow = null;
  }

  expand(row: PerformanceView) {
    this.expandedRow = this.expandedRow === row ? null : row;
    if (!this.expandedRow) {
      return;
    }

    this.performanceViewDataSub.length = 0;
    this.performanceViewMapSub.clear();
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
        client: this.selectedClients.map(client => client.id!.toString()),
        vendor: this.selectedVendors.map(vendor => vendor.id!.toString()),
        clientMedia: this.selectedClientMedias.map(clientMedia => clientMedia.id!.toString()),
        vendorMedia: this.selectedVendorMedias.map(vendorMedia => vendorMedia.id!.toString()),
        platform: this.selectedPlatforms,
        format: this.selectedFormats,
        budget: this.selectedBudgets,
        mode: this.selectedModes,
      },
      searchKey: ['name', 'tagId'],
      searchValue: this.searchValue,
    };

    this.dataRequest$.next(this.formQuery);
  }

  download() {
    this.prepareRange();

    if (this.direction() === 'client') {
      this.performanceAPI.downloadPerformanceClientList(
        this.performanceInterval,
        this.toISOStringWithTimezone(this.performanceStart),
        this.toISOStringWithTimezone(this.performanceEnd),
        this.formQuery,
      ).subscribe(data => {
        const contentType = 'application/vnd.ms-excel';
        const blob = new Blob([data], { type: contentType });
        const url = window.URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'performance-client.xlsx';
        a.click();

        window.URL.revokeObjectURL(url);
      });
    } else {
      this.performanceAPI.downloadPerformanceVendorList(
        this.performanceInterval,
        this.toISOStringWithTimezone(this.performanceStart),
        this.toISOStringWithTimezone(this.performanceEnd),
        this.formQuery,
      ).subscribe(data => {
        const contentType = 'application/vnd.ms-excel';
        const blob = new Blob([data], { type: contentType });
        const url = window.URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'performance-vendor.xlsx';
        a.click();

        window.URL.revokeObjectURL(url);
      });
    }
  }

  showBundleDetail(performance: PerformanceView, expand: boolean) {
    this.formQueryBundle = {
      filter: {
        clientMode: [String(this.mode())],
        vendorMode: [String(this.mode())],
        client: performance.client !== 0 ? [String(performance.client)] : this.formQuery.filter?.client,
        vendor: performance.vendor !== 0 ? [String(performance.vendor)] : this.formQuery.filter?.vendor,
        clientMedia: performance.clientMedia !== 0 ? [String(performance.clientMedia)] : this.formQuery.filter?.clientMedia,
        vendorMedia: performance.vendorMedia !== 0 ? [String(performance.vendorMedia)] : this.formQuery.filter?.vendorMedia,
        clientPort: performance.clientPort !== 0 ? [String(performance.clientPort)] : this.formQuery.filter?.clientPort,
        vendorPort: performance.vendorPort !== 0 ? [String(performance.vendorPort)] : this.formQuery.filter?.vendorPort,
      },
      searchKey: this.formQuery.searchKey,
      searchValue: this.formQuery.searchValue,
    };

    this.dialog.open(BundleDialogComponent, {
      data: {
        query: this.formQueryBundle,
        interval: this.performanceInterval,
        expand: expand,
        start: performance.start,
        end: performance.end,
      },
      minWidth: '80vw',
      minHeight: '80vh',
      maxWidth: '80vw',
      maxHeight: '80vh',
      width: '80vw',
      height: '80vh',
      autoFocus: false,
    });
  }

  clear(
    event: Event,
    field: keyof PerformanceQueryControls,
    value: string | Client[] | Vendor[] | ClientMedia[] | VendorMedia[] | string[]
  ) {
    event.stopPropagation();
    this.formGroupQuery.patchValue({[field]: value});
    this.query();
  }

  canViewConnection(): boolean {
    return this.tenantService.isTenantManager() || this.tenantService.isTenantOperator() || this.tenantService.isTenantObserver() || this.tenantService.isManager();
  }

  changePerformanceInterval(event: MatButtonToggleChange) {
    if (event.value !== this.performanceInterval) {
      if (this.performanceInterval === 'minute' || this.performanceInterval === 'quarter' || this.performanceInterval === 'hour') {
        if (event.value === 'day' || event.value === 'month' || event.value === 'year') {
          this.changedByProgram = true;
          this.range.controls.start.setValue(null);
          this.range.controls.end.setValue(null);
          this.range.controls.time.setValue(null);
        }
      }
      if (this.performanceInterval === 'day' || this.performanceInterval === 'month' || this.performanceInterval === 'year') {
        if (event.value === 'minute' || event.value === 'quarter' || event.value === 'hour') {
          this.changedByProgram = true;
          this.range.controls.start.setValue(new Date());
          this.range.controls.end.setValue(new Date());
          this.range.controls.time.setValue(null);
        }
      }

      this.performanceInterval = event.value;
      this.query();
    }
  }

  changePerformanceAggregateUpstream(event: MatButtonToggleChange) {
    if (event.value !== this.performanceAggregateUpstream) {
      this.performanceAggregateUpstream = event.value;
      if (this.direction() === 'client') {
        this.expandedRow = null;
        this.prepareDisplayColumns();

        this.updatePerformanceView();
      } else {
        this.updatePerformanceViewSub();
      }
    }
  }

  changePerformanceAggregateDownstream(event: MatButtonToggleChange) {
    if (event.value !== this.performanceAggregateDownstream) {
      this.performanceAggregateDownstream = event.value;
      if (this.direction() === 'vendor') {
        this.expandedRow = null;
        this.prepareDisplayColumns();

        this.updatePerformanceView();
      } else {
        this.updatePerformanceViewSub();
      }
    }
  }

  prepareDisplayColumns() {
    this.displayedColumns = ['expand', 'time'];
    this.displayedColumnsWidth = 80 + 250;
    if (this.direction() === 'client' && (this.performanceAggregateUpstream === 'client' || this.performanceAggregateUpstream === 'clientport')) {
      this.displayedColumns.push('partner');
      // time column is 120px when partner column exists
      this.displayedColumnsWidth = this.displayedColumnsWidth - 250 + 120 + 250;
    }
    if (this.direction() === 'vendor' && (this.performanceAggregateDownstream === 'vendor' || this.performanceAggregateDownstream === 'vendorport')) {
      this.displayedColumns.push('partner');
      // time column is 120px when partner column exists
      this.displayedColumnsWidth = this.displayedColumnsWidth - 250 + 120 + 250;
    }
    this.displayedColumns = [...this.displayedColumns, ...this.selectedColumns, 'actions'];
    this.displayedColumnsWidth = this.displayedColumnsWidth + this.selectedColumns.length * 120 + 80;

    this.onResize();
  }

  prepareRange() {
    const now = new Date();
    const start = this.range.controls.start.value;
    const end = this.range.controls.end.value;
    const time = this.range.controls.time.value;

    if (this.performanceInterval === 'minute') {
      if (time) {
        this.performanceStart = new Date(Math.trunc(new Date(Date.parse(String(time))).getTime() / 180000) * 180000);
        this.performanceEnd = new Date(Math.trunc(new Date(Date.parse(String(time))).getTime() / 180000) * 180000 + 179999);
      } else {
        if (start && end) {
          this.performanceStart = new Date(Date.parse(String(start)));
          this.performanceStart.setHours(0);
          this.performanceStart.setMinutes(0);
          this.performanceStart.setSeconds(0);
          this.performanceStart.setMilliseconds(0);
          this.performanceEnd = new Date(Date.parse(String(end)));
          this.performanceEnd.setHours(23);
          this.performanceEnd.setMinutes(59);
          this.performanceEnd.setSeconds(59);
          this.performanceEnd.setMilliseconds(999);
        } else {
          now.setMinutes(Math.trunc(now.getMinutes() / 3) * 3);
          now.setSeconds(0);
          now.setMilliseconds(0);
          this.performanceStart = new Date(now);
          this.performanceEnd = new Date(now.getTime() + 179999);
        }
      }
    }
    if (this.performanceInterval === 'quarter') {
      if (time) {
        this.performanceStart = new Date(Math.trunc(new Date(Date.parse(String(time))).getTime() / 900000) * 900000);
        this.performanceEnd = new Date(Math.trunc(new Date(Date.parse(String(time))).getTime() / 900000) * 900000 + 899999);
      } else {
        if (start && end) {
          this.performanceStart = new Date(Date.parse(String(start)));
          this.performanceStart.setHours(0);
          this.performanceStart.setMinutes(0);
          this.performanceStart.setSeconds(0);
          this.performanceStart.setMilliseconds(0);
          this.performanceEnd = new Date(Date.parse(String(end)));
          this.performanceEnd.setHours(23);
          this.performanceEnd.setMinutes(59);
          this.performanceEnd.setSeconds(59);
          this.performanceEnd.setMilliseconds(999);
        } else {
          now.setMinutes(Math.trunc(now.getMinutes() / 15) * 15);
          now.setSeconds(0);
          now.setMilliseconds(0);
          this.performanceStart = new Date(now);
          this.performanceEnd = new Date(now.getTime() + 899999);
        }
      }
    }
    if (this.performanceInterval === 'hour') {
      if (time) {
        this.performanceStart = new Date(Math.trunc(new Date(Date.parse(String(time))).getTime() / 3600000) * 3600000);
        this.performanceEnd = new Date(Math.trunc(new Date(Date.parse(String(time))).getTime() / 3600000) * 3600000 + 3599999);
      } else {
        if (start && end) {
          this.performanceStart = new Date(Date.parse(String(start)));
          this.performanceStart.setHours(0);
          this.performanceStart.setMinutes(0);
          this.performanceStart.setSeconds(0);
          this.performanceStart.setMilliseconds(0);
          this.performanceEnd = new Date(Date.parse(String(end)));
          this.performanceEnd.setHours(23);
          this.performanceEnd.setMinutes(59);
          this.performanceEnd.setSeconds(59);
          this.performanceEnd.setMilliseconds(999);
        } else {
          now.setHours(0);
          now.setMinutes(0);
          now.setSeconds(0);
          now.setMilliseconds(0);
          this.performanceStart = new Date(now);
          this.performanceEnd = new Date(now.getTime() + 3599999);
        }
      }
    }
    if (this.performanceInterval === 'day') {
      if (start && end) {
        this.performanceStart = new Date(Date.parse(String(start)));
        this.performanceEnd = new Date(Date.parse(String(end)));
      } else {
        this.performanceEnd = new Date(now);
        now.setMilliseconds(0);
        now.setSeconds(0);
        now.setMinutes(0);
        now.setHours(0);
        now.setDate(now.getDate() - 30);
        this.performanceStart = new Date(now);
      }
    }
    if (this.performanceInterval === 'month') {
      if (start && end) {
        this.performanceStart = new Date(Date.parse(String(start)));
        this.performanceEnd = new Date(Date.parse(String(end)));
      } else {
        this.performanceEnd = new Date(now);
        now.setMilliseconds(0);
        now.setSeconds(0);
        now.setMinutes(0);
        now.setHours(0);
        now.setMonth(now.getMonth() - 12);
        this.performanceStart = new Date(now);
      }
    }
    if (this.performanceInterval === 'year') {
      if (start && end) {
        this.performanceStart = new Date(Date.parse(String(start)));
        this.performanceEnd = new Date(Date.parse(String(end)));
      } else {
        this.performanceEnd = new Date(now);
        now.setMilliseconds(0);
        now.setSeconds(0);
        now.setMinutes(0);
        now.setHours(0);
        now.setFullYear(now.getFullYear() - 3);
        this.performanceStart = new Date(now);
      }
    }
  }

  prepareTimestampList() {
    this.timestamps = [];

    for (let t = this.performanceEnd.getTime(); t >= this.performanceStart.getTime();) {
      const date = new Date(t);
      if (this.performanceInterval === 'minute') {
        date.setMilliseconds(0);
        date.setSeconds(0);
        date.setMinutes(date.getMinutes() - date.getMinutes() % 3);
      }
      if (this.performanceInterval === 'quarter') {
        date.setMilliseconds(0);
        date.setSeconds(0);
        date.setMinutes(date.getMinutes() - date.getMinutes() % 15);
      }
      if (this.performanceInterval === 'hour') {
        date.setMilliseconds(0);
        date.setSeconds(0);
        date.setMinutes(0);
      }
      if (this.performanceInterval === 'day') {
        date.setMilliseconds(0);
        date.setSeconds(0);
        date.setMinutes(0);
        date.setHours(0);
      }
      if (this.performanceInterval === 'month') {
        date.setMilliseconds(0);
        date.setSeconds(0);
        date.setMinutes(0);
        date.setHours(0);
        date.setDate(1);
      }
      if (this.performanceInterval === 'year') {
        date.setMilliseconds(0);
        date.setSeconds(0);
        date.setMinutes(0);
        date.setHours(0);
        date.setDate(1);
        date.setMonth(0);
      }

      this.timestamps.push(date);
      t = date.getTime();

      if (this.performanceInterval === 'minute') {
        t = t - 180000;
      }
      if (this.performanceInterval === 'quarter') {
        t = t - 900000;
      }
      if (this.performanceInterval === 'hour') {
        t = t - 3600000;
      }
      if (this.performanceInterval === 'day') {
        t = t - 86400000;
      }
      if (this.performanceInterval === 'month') {
        const date = new Date(t);
        date.setMonth(date.getMonth() - 1);
        t = date.getTime();
      }
      if (this.performanceInterval === 'year') {
        const date = new Date(t);
        date.setFullYear(date.getFullYear() - 1);
        t = date.getTime();
      }
    }
  }

  updatePerformanceView() {
    this.expandedRow = null;

    this.minTimestamp = this.performanceEnd;
    this.maxTimestamp = this.performanceStart;
    this.performanceViewData.length = 0;
    this.performanceViewMap.clear();
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

    for (const performance of this.performanceData) {
      if (this.minTimestamp > new Date(performance.time)) {
        this.minTimestamp = new Date(performance.time);
      }
      if (this.maxTimestamp < new Date(performance.time)) {
        this.maxTimestamp = new Date(performance.time);
      }

      let time = '';
      if (this.performanceInterval === 'minute') {
        time = this.toISOStringWithTimezone(new Date(performance.time)).substring(0, 16).replace('T', ' ');
      }
      if (this.performanceInterval === 'quarter') {
        time = this.toISOStringWithTimezone(new Date(performance.time)).substring(0, 16).replace('T', ' ');
      }
      if (this.performanceInterval === 'hour') {
        time = this.toISOStringWithTimezone(new Date(performance.time)).substring(0, 13).replace('T', ' ') + ':00';
      }
      if (this.performanceInterval === 'day') {
        time = this.toISOStringWithTimezone(new Date(performance.time)).substring(0, 10).replace('T', ' ');
      }
      if (this.performanceInterval === 'month') {
        time = this.toISOStringWithTimezone(new Date(performance.time)).substring(0, 7).replace('T', ' ');
      }
      if (this.performanceInterval === 'year') {
        time = this.toISOStringWithTimezone(new Date(performance.time)).substring(0, 4).replace('T', ' ');
      }

      let key = time + '|';
      if (this.performanceAggregateUpstream === 'client' || this.performanceAggregateUpstream === 'clientport') {
        key += 'C' + this.clientPortMap.get(performance.clientPort)?.client.id + '|';
      }
      if (this.performanceAggregateUpstream === 'clientport') {
        key += 'CP' + performance.clientPort + '|';
      }

      if (this.performanceAggregateDownstream === 'vendor' || this.performanceAggregateDownstream === 'vendorport') {
        key += 'V' + this.vendorPortMap.get(performance.vendorPort)?.vendor.id + '|';
      }
      if (this.performanceAggregateDownstream === 'vendorport') {
        key += 'VP' + performance.vendorPort + '|';
      }
      if (!this.performanceViewMap.has(key)) {
        const performanceView: PerformanceView = {
          time: time,
          start: new Date(performance.time),
          end: new Date(performance.time),
          client: this.performanceAggregateUpstream === 'client' || this.performanceAggregateUpstream === 'clientport'
            ? performance.clientPort === -1 ?
                -1
                :
                this.clientPortMap.get(performance.clientPort)?.client.id
                  ?? 0
            : 0,
          clientMedia: this.performanceAggregateUpstream === 'clientport'
            ? performance.clientPort === -1 ?
                -1
                :
                this.clientPortMap.get(performance.clientPort)?.clientMedia.id
                  ?? 0
            : 0,
          clientPort: this.performanceAggregateUpstream === 'clientport' ? performance.clientPort : 0,
          vendor: this.performanceAggregateDownstream === 'vendor' || this.performanceAggregateDownstream === 'vendorport'
            ? performance.vendorPort === -1 ?
                -1
                :
                this.vendorPortMap.get(performance.vendorPort)?.vendor.id
                  ?? 0
            : 0,
          vendorMedia: this.performanceAggregateDownstream === 'vendorport'
            ? performance.vendorPort === -1 ?
                -1
                :
                this.vendorPortMap.get(performance.vendorPort)?.vendorMedia.id
                  ?? 0
            : 0,
          vendorPort: this.performanceAggregateDownstream === 'vendorport' ? performance.vendorPort : 0,

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
      if (this.direction() === 'client') {
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
      }
      if (this.direction() === 'vendor') {
        performanceView.request +=
          performance.eventA + performance.eventB + performance.eventC + performance.eventD + performance.eventE +
          performance.eventF + performance.eventG + performance.eventH + performance.eventI + performance.eventJ;
        performanceView.requestv +=
          performance.eventH + performance.eventI + performance.eventJ;
        performanceView.response +=
          performance.eventI + performance.eventJ;
        performanceView.responsev +=
          performance.eventI + performance.eventJ;
      }
      performanceView.impression += performance.impression;
      performanceView.click += performance.click;
      performanceView.income += performance.income;
      performanceView.outcomeUpstream += performance.outcomeUpstream;
      performanceView.outcomeRebate += performance.outcomeRebate;
      performanceView.outcomeDownstream += performance.outcomeDownstream;
      performanceView.offer += performance.offer;

      if (this.direction() === 'client') {
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
      }
      if (this.direction() === 'vendor') {
        this.performanceViewTotal.request +=
          performance.eventA + performance.eventB + performance.eventC + performance.eventD + performance.eventE +
          performance.eventF + performance.eventG + performance.eventH + performance.eventI + performance.eventJ;
        this.performanceViewTotal.requestv +=
          performance.eventH + performance.eventI + performance.eventJ;
        this.performanceViewTotal.response +=
          performance.eventI + performance.eventJ;
        this.performanceViewTotal.responsev +=
          performance.eventI + performance.eventJ;
      }
      this.performanceViewTotal.impression += performance.impression;
      this.performanceViewTotal.click += performance.click;
      this.performanceViewTotal.income += performance.income;
      this.performanceViewTotal.outcomeUpstream += performance.outcomeUpstream;
      this.performanceViewTotal.outcomeRebate += performance.outcomeRebate;
      this.performanceViewTotal.outcomeDownstream += performance.outcomeDownstream;
      this.performanceViewTotal.offer += performance.offer;
    }

    for (const timestamp of this.timestamps) {
      if (this.minTimestamp > timestamp || this.maxTimestamp < timestamp) {
        continue;
      }

      let time = '';
      if (this.performanceInterval === 'minute') {
        time = this.toISOStringWithTimezone(new Date(timestamp)).substring(0, 16).replace('T', ' ');
      }
      if (this.performanceInterval === 'quarter') {
        time = this.toISOStringWithTimezone(new Date(timestamp)).substring(0, 16).replace('T', ' ');
      }
      if (this.performanceInterval === 'hour') {
        time = this.toISOStringWithTimezone(new Date(timestamp)).substring(0, 13).replace('T', ' ') + ':00';
      }
      if (this.performanceInterval === 'day') {
        time = this.toISOStringWithTimezone(new Date(timestamp)).substring(0, 10).replace('T', ' ');
      }
      if (this.performanceInterval === 'month') {
        time = this.toISOStringWithTimezone(new Date(timestamp)).substring(0, 7).replace('T', ' ');
      }
      if (this.performanceInterval === 'year') {
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

    this.dataSource.data = this.performanceViewData.sort((a, b) => {
      const keya = a.time + '|' + a.clientPort + '|' + a.vendorPort;
      const keyb = b.time + '|' + b.clientPort + '|' + b.vendorPort;
      return keya > keyb ? -1 : 1;
    });
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
    this.dataSource.sortingDataAccessor = (item, property) => {
      switch (property) {
        case 'request-valid': return item.requestv ?? -1;
        case 'response-valid': return item.responsev ?? -1;
        case 'offer': return item.response ? (1.0 * (item.offer ?? 0) / 100 / item.response) : -1;
        case 'gfr': return item.requestv ? (1.0 * (item.response ?? 0) / item.requestv) : -1;
        case 'gfrv': return item.requestv ? (1.0 * (item.responsev ?? 0) / item.requestv) : -1;
        case 'er': return item.response ? (1.0 * (item.impression ?? 0) / item.response) : -1;
        case 'ctr': return item.impression ? (1.0 * (item.click ?? 0) / item.impression) : -1;
        case 'rv': return item.requestv ? (1.0 * (item.income ?? 0) / item.requestv / 10) : -1;
        case 'outcome': return item.outcomeUpstream + item.outcomeRebate + item.outcomeDownstream;
        case 'profit': return item.income - (item.outcomeUpstream + item.outcomeRebate + item.outcomeDownstream);
        case 'cpmu': return item.impression ? (1.0 * (item.income ?? 0) / 100 / item.impression) : -1;
        case 'cpmd': return item.impression ? (1.0 * (item.outcomeDownstream ?? 0) / 100 / item.impression) : -1;
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

    this.changedByProgram = false;
  }

  updatePerformanceViewSub() {
    this.performanceViewDataSub.length = 0;
    this.performanceViewMapSub.clear();

    for (const performance of this.performanceDataSub) {
      let time = '';
      if (this.performanceInterval === 'minute') {
        time = this.toISOStringWithTimezone(new Date(performance.time)).substring(0, 16).replace('T', ' ');
      }
      if (this.performanceInterval === 'quarter') {
        time = this.toISOStringWithTimezone(new Date(performance.time)).substring(0, 16).replace('T', ' ');
      }
      if (this.performanceInterval === 'hour') {
        time = this.toISOStringWithTimezone(new Date(performance.time)).substring(0, 13).replace('T', ' ') + ':00';
      }
      if (this.performanceInterval === 'day') {
        time = this.toISOStringWithTimezone(new Date(performance.time)).substring(0, 10).replace('T', ' ');
      }
      if (this.performanceInterval === 'month') {
        time = this.toISOStringWithTimezone(new Date(performance.time)).substring(0, 7).replace('T', ' ');
      }
      if (this.performanceInterval === 'year') {
        time = this.toISOStringWithTimezone(new Date(performance.time)).substring(0, 4).replace('T', ' ');
      }

      let key = time + '|';
      if (this.performanceAggregateUpstream === 'client' || this.performanceAggregateUpstream === 'clientport') {
        key += 'C' + this.clientPortMap.get(performance.clientPort)?.client.id + '|';
      }
      if (this.performanceAggregateUpstream === 'clientport') {
        key += 'CP' + performance.clientPort + '|';
      }
      if (this.performanceAggregateDownstream === 'vendor' || this.performanceAggregateDownstream === 'vendorport') {
        key += 'V' + this.vendorPortMap.get(performance.vendorPort)?.vendor.id + '|';
      }
      if (this.performanceAggregateDownstream === 'vendorport') {
        key += 'VP' + performance.vendorPort + '|';
      }
      if (!this.performanceViewMapSub.has(key)) {
        const performanceView: PerformanceView = {
          time: time,
          start: new Date(performance.time),
          end: new Date(performance.time),
          client: this.performanceAggregateUpstream === 'client' || this.performanceAggregateUpstream === 'clientport'
            ? performance.clientPort === -1 ?
                -1
                :
                this.clientPortMap.get(performance.clientPort)?.client.id
                  ?? 0
            : 0,
          clientMedia: this.performanceAggregateUpstream === 'clientport'
            ? performance.clientPort === -1 ?
                -1
                :
                this.clientPortMap.get(performance.clientPort)?.clientMedia.id
                  ?? 0
            : 0,
          clientPort: this.performanceAggregateUpstream === 'clientport' ? performance.clientPort : 0,
          vendor: this.performanceAggregateDownstream === 'vendor' || this.performanceAggregateDownstream === 'vendorport'
            ? performance.vendorPort === -1 ?
                -1
                :
                this.vendorPortMap.get(performance.vendorPort)?.vendor.id
                  ?? 0
            : 0,
          vendorMedia: this.performanceAggregateDownstream === 'vendorport'
            ? performance.vendorPort === -1 ?
                -1
                :
                this.vendorPortMap.get(performance.vendorPort)?.vendorMedia.id
                  ?? 0
            : 0,
          vendorPort: this.performanceAggregateDownstream === 'vendorport' ? performance.vendorPort : 0,
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

        this.performanceViewDataSub.push(performanceView);
        this.performanceViewMapSub.set(key, performanceView);
      }

      const performanceView = this.performanceViewMapSub.get(key)!;
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
      performanceView.offer += performance.offer;
    }

    this.performanceViewDataSub = Array.from(this.performanceViewMapSub.values());

    this.dataSourceSub.data = this.performanceViewDataSub.sort((a, b) => {
      if (a.client === -1 || a.clientPort === -1 || a.vendor === -1 || a.vendorPort === -1) {
        return 1;
      }
      if (b.client === -1 || b.clientPort === -1 || b.vendor === -1 || b.vendorPort === -1) {
        return -1;
      }
      const keya = a.request;
      const keyb = b.request;
      return keya > keyb ? -1 : 1;
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
