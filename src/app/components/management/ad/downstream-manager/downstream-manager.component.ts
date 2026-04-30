import { AfterViewInit, ChangeDetectionStrategy, Component, DestroyRef, DoCheck, effect, ElementRef, HostListener, inject, KeyValueDiffer, KeyValueDiffers, OnInit, signal, viewChild, WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { ActivatedRoute } from '@angular/router';
import { asyncScheduler, catchError, debounceTime, forkJoin, scheduled, Subject, switchMap } from 'rxjs';

import { BillAPI, BillView, ClientPort, PartnerType, PerformancePlaceholder, Query, Sign, SignStatus, Vendor, VendorAPI, VendorMedia, VendorMediaAPI, VendorPort, VendorPortAPI } from '../../../../core';
import { TenantService } from '../../../../services';
import { AdEntityComponent, FilteredSelectVendorComponent, FilteredSelectVendorMediaComponent } from '../../../../shared';
import { ClientPortDialogComponent, ClientPortDialogData } from '../clientport-dialog/clientport-dialog.component';
import { VendorPortDialogComponent, VendorPortDialogData } from '../vendorport-dialog/vendorport-dialog.component';

interface DownstreamManagerQueryControls {
  vendor: FormControl<Vendor[]>;
  vendorMedia: FormControl<VendorMedia[]>;
  format: FormControl<string[]>;
  mode: FormControl<string[]>;
  search: FormControl<string>;
}

interface DownstreamManagerRangeControls {
  start: FormControl<Date | null>;
  end: FormControl<Date | null>;
}

@Component({
  selector: 'carambola-downstream-manager',
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
    MatSort,
    MatSortModule,
    MatTableModule,
    CdkMenuModule,
    FilteredSelectVendorComponent,
    FilteredSelectVendorMediaComponent,
    AdEntityComponent,
  ],
  templateUrl: './downstream-manager.component.html',
  styleUrls: ['./downstream-manager.component.scss'],
})
export class DownstreamManagerComponent implements OnInit, AfterViewInit, DoCheck {
  private destroyRef = inject(DestroyRef);
  private formBuilder = inject(FormBuilder);
  private tenantService = inject(TenantService);
  private vendorAPI = inject(VendorAPI);
  private vendorMediaAPI = inject(VendorMediaAPI);
  private vendorPortAPI = inject(VendorPortAPI);
  private billAPI = inject(BillAPI);
  private dialog = inject(MatDialog);
  private route = inject(ActivatedRoute);
  private readonly differs = inject(KeyValueDiffers);

  SignStatus = SignStatus;

  displayedColumns = signal<string[]>([]);
  displayedColumnsWidth = 0;
  scrollLeft = 0;
  scrollRight = 0;
  tableWidth = 0;

  vendors: Vendor[] = [];
  allVendorMedias: VendorMedia[] = [];
  vendorMedias: VendorMedia[] = [];
  vendorPorts: VendorPort[] = [];

  vendorMap: Map<number | null, Vendor> = new Map<number | null, Vendor>();
  vendorMediaMap: Map<number | null, VendorMedia> = new Map<number | null, VendorMedia>();
  vendorPortMap: Map<number | null, VendorPort> = new Map<number | null, VendorPort>();

  mode: WritableSignal<PartnerType> = signal(PartnerType.PARTNER_TYPE_UNKNOWN);
  formGroupQuery: FormGroup<DownstreamManagerQueryControls>;
  filterMode: Map<string, string>;
  formQuery: Query<PerformancePlaceholder> = {
    filter: {},
    searchKey: ['name', 'tagId'],
    searchValue: '',
  };
  range: FormGroup<DownstreamManagerRangeControls>;
  differ: KeyValueDiffer<string, unknown>;

  signAggregateDownstream = 'all';

  signInterval = 'day';
  signStart = new Date();
  signEnd = new Date();

  minTimestamp: Date = new Date();
  maxTimestamp: Date = new Date();
  signData: Sign[] = [];

  signViewData: BillView[] = [];
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

  readonly sort = viewChild(MatSort);
  readonly paginator = viewChild(MatPaginator);
  readonly table = viewChild<ElementRef>('table');

  dataRequest$ = new Subject<Query<PerformancePlaceholder>>();
  dataSource = signal(this.createDataSource([]));

  constructor() {
    this.formGroupQuery = this.formBuilder.group({
      vendor: this.formBuilder.nonNullable.control<Vendor[]>([]),
      vendorMedia: this.formBuilder.nonNullable.control<VendorMedia[]>([]),
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
        this.vendors = results[0].filter(vendor => !vendor.deleted);
        this.allVendorMedias = results[1].filter(vendorMedia => !vendorMedia.deleted);
        this.vendorMedias = this.allVendorMedias;
        this.vendorPorts = results[2].filter(vendorPort => !vendorPort.deleted);

        this.vendorMap = new Map(this.vendors.map(v => [v.id, v]));
        this.vendorMediaMap = new Map(this.vendorMedias.map(vm => [vm.id, vm]));
        this.vendorPortMap = new Map(this.vendorPorts.map(vp => [vp.id, vp]));

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

        if (this.signInterval === 'day') {
          if (this.range.controls.start.value && this.range.controls.end.value) {
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
          if (this.range.controls.start.value && this.range.controls.end.value) {
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
          if (this.range.controls.start.value && this.range.controls.end.value) {
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

        return this.billAPI.getSignList(
          this.signInterval,
          this.toISOStringWithTimezone(this.signStart),
          this.toISOStringWithTimezone(this.signEnd),
          query
        ).pipe(
          catchError(() => {
            return scheduled([[]], asyncScheduler);
          })
        );
      }),
    ).subscribe(result => {
      this.signData = result;
      this.updateSignView();
    });

    this.formGroupQuery.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.query();
    });
  }

  ngAfterViewInit() {
    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
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

  get selectedVendors(): Vendor[] {
    return this.formGroupQuery.controls.vendor.value;
  }

  get selectedVendorMedias(): VendorMedia[] {
    return this.formGroupQuery.controls.vendorMedia.value;
  }

  get selectedModes(): string[] {
    return this.formGroupQuery.controls.mode.value;
  }

  get searchValue(): string {
    return this.formGroupQuery.controls.search.value;
  }

  query() {
    if (this.selectedVendors.length > 0) {
      this.vendorMedias = this.allVendorMedias.filter(vendorMedia => this.selectedVendors.map(vendor => vendor.id).indexOf(vendorMedia.vendor.id) >= 0);
    } else {
      this.vendorMedias = this.allVendorMedias;
    }

    this.formQuery = {
      filter: {
        clientMode: [String(this.mode())],
        vendorMode: [String(this.mode())],
        vendor: this.formGroupQuery.controls.vendor.value.map(vendor => vendor.id!.toString()),
        vendorMedia: this.formGroupQuery.controls.vendorMedia.value.map(vendorMedia => vendorMedia.id!.toString()),
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

    if (this.signInterval === 'day') {
      if (this.range.controls.start.value && this.range.controls.end.value) {
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
      if (this.range.controls.start.value && this.range.controls.end.value) {
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
      if (this.range.controls.start.value && this.range.controls.end.value) {
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

  clear(event: Event, field: keyof DownstreamManagerQueryControls, value: string | Vendor[] | VendorMedia[] | string[]) {
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

  changeSignAggregateDownstream(event: MatButtonToggleChange) {
    if (event.value !== this.signAggregateDownstream) {
      this.signAggregateDownstream = event.value;
      this.prepareDisplayColumns();

      this.updateSignView();
    }
  }

  prepareDisplayColumns() {
    const displayedColumns = ['time'];
    this.displayedColumnsWidth = 120;
    if (this.signAggregateDownstream === 'vendor' || this.signAggregateDownstream === 'vendorport') {
      displayedColumns.push('partner');
      // time column is 120px when partner column exists
      this.displayedColumnsWidth = this.displayedColumnsWidth + 250;
    }
    this.displayedColumns.set([...displayedColumns, 'cost', 'impression', 'click', 'request', 'response']);
    this.displayedColumnsWidth = this.displayedColumnsWidth + 5 * 120;

    this.onResize();
  }

  updateSignView() {
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

    this.signViewData.length = 0;
    this.signViewMap.clear();
    for (const sign of this.signData) {
      if (this.minTimestamp > new Date(sign.date)) {
        this.minTimestamp = new Date(sign.date);
      }
      if (this.maxTimestamp < new Date(sign.date)) {
        this.maxTimestamp = new Date(sign.date);
      }

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

    const data = this.signViewData.sort((a, b) => {
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
