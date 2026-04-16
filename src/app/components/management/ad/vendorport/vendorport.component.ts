import { AfterViewInit, Component, effect, OnInit, signal, ViewChild, WritableSignal, inject } from '@angular/core';
import { UntypedFormGroup, UntypedFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { catchError, debounceTime, of, Subject, switchMap } from 'rxjs';

import { PartnerType, PortType, Query, Vendor, VendorAPI, VendorMedia, VendorMediaAPI, VendorPort, VendorPortAPI } from '../../../../core';
import { AdEntityComponent, FilteredSelectVendorComponent, FilteredSelectVendorMediaComponent } from '../../../../shared';
import { TenantService } from '../../../../services';
import { VendorPortDialogComponent, VendorPortDialogData } from '../vendorport-dialog/vendorport-dialog.component';

@Component({
  selector: 'carambola-vendorport-manager',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginator,
    MatPaginatorModule,
    MatSelectModule,
    MatSort,
    MatSortModule,
    MatTableModule,
    AdEntityComponent,
    FilteredSelectVendorComponent,
    FilteredSelectVendorMediaComponent,
  ],
  templateUrl: './vendorport.component.html',
  styleUrls: ['./vendorport.component.scss'],
})
export class VendorPortManagerComponent implements OnInit, AfterViewInit {
  private formBuilder = inject(UntypedFormBuilder);
  private dialog = inject(MatDialog);
  private tenantService = inject(TenantService);
  private vendorAPI = inject(VendorAPI);
  private vendorMediaAPI = inject(VendorMediaAPI);
  private vendorPortAPI = inject(VendorPortAPI);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  PortType = PortType;

  displayedColumns: string[] = ['vendor', 'vendorMedia', 'name', 'format', 'budget', 'connection', 'actions'];
  hoverRow: VendorPort | null = null;

  mode: WritableSignal<PartnerType> = signal(PartnerType.PARTNER_TYPE_UNKNOWN);
  formGroupQuery: UntypedFormGroup;
  filterVendor: Vendor[] = [];
  allVendorMedia: VendorMedia[] = [];
  filterVendorMedia: VendorMedia[] = [];
  filterPlatform: Map<string, string>;
  filterFormat: Map<string, string>;
  filterBudget: Map<string, string>;
  filterMode: Map<string, string>;
  filterStatus: Map<string, string>;
  formQuery: Query<VendorPort> = {
    filter: {},
    searchKey: ['name', 'tagId'],
    searchValue: '',
  };

  @ViewChild(MatSort, {static: false}) sort: MatSort | null = null;
  @ViewChild(MatPaginator, {static: false}) paginator: MatPaginator | null = null;

  dataRequest$ = new Subject<Query<VendorPort>>();
  dataSource = new MatTableDataSource<VendorPort>([]);

  constructor() {
    this.formGroupQuery = this.formBuilder.group({
      'vendor': [[], null],
      'vendorMedia': [[], null],
      'platform': [[], null],
      'format': [[], null],
      'budget': [[], null],
      'mode': [[], null],
      'status': [[], null],
      'search': ['', null],
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
    this.filterStatus = new Map([
      ['1', '启用'],
      ['2', '未启用'],
    ]);

    effect(() => {
      const mode = this.mode();
      const tenant = this.tenantService.tenant();

      if (mode === PartnerType.PARTNER_TYPE_UNKNOWN) {
        return;
      }
      if (!tenant) {
        return;
      }

      this.vendorAPI.getVendorList({
        filter: {
          mode: [String(mode)],
        },
        searchKey: [],
        searchValue: '',
      }).subscribe(vendors => {
        vendors = vendors.filter(vendor => !vendor.deleted);
        this.filterVendor = vendors;
      });
      this.vendorMediaAPI.getVendorMediaList({
        filter: {
          vendorMode: [String(mode)],
        },
        searchKey: [],
        searchValue: '',
      }).subscribe(vendorMedias => {
        vendorMedias = vendorMedias.filter(vendorMedia => !vendorMedia.deleted);
        this.allVendorMedia = vendorMedias;
        this.filterVendorMedia = vendorMedias;
      });

      this.query();
    });
  }

  ngOnInit() {
    this.dataRequest$.pipe(
      debounceTime(500),
      switchMap(query =>
        this.vendorPortAPI.getVendorPortList(query).pipe(
          catchError(() => {
            return of([]);
          })
        )
      ),
    ).subscribe(vendorPorts => {
      let data = vendorPorts.filter(vendorPort => !vendorPort.deleted);
      if (this.formGroupQuery.value.status.length > 0) {
        if (this.formGroupQuery.value.status.indexOf('1') < 0) {
          data = data.filter(vendorPort => {
            return vendorPort.connection.filter(connection => connection.enabled).length === 0;
          });
        }
        if (this.formGroupQuery.value.status.indexOf('2') < 0) {
          data = data.filter(vendorPort => {
            return vendorPort.connection.filter(connection => connection.enabled).length > 0;
          });
        }
      }
      this.dataSource.data = data.sort((a, b) => {
        const keya = a.updateTime ? new Date(a.updateTime) : new Date(0);
        const keyb = b.updateTime ? new Date(b.updateTime) : new Date(0);
        if (keya < keyb) {
          return 1;
        } else if (keya > keyb) {
          return -1;
        } else {
          return 0;
        }
      });
      this.dataSource.sort = this.sort;
      this.dataSource.paginator = this.paginator;
      this.dataSource.sortingDataAccessor = (item, property) => {
        switch (property) {
          case 'vendor':
            return item.vendor.name;
          case 'vendorMedia':
            return item.vendorMedia.name;
          case 'name':
            return item.name;
          case 'format':
            return item.format;
          case 'budget':
            return item.budget;
          case 'tagId':
            return item.tagId;
          case 'mode':
            return item.mode;
          case 'connection':
            return item.connection.filter(connection => connection.enabled).length;
          default:
            return '';
        }
      }
    });

    this.formGroupQuery.valueChanges.subscribe(() => {
      this.query();
    })
  }

  ngAfterViewInit() {
    this.route.queryParams.subscribe(params => {
      this.formGroupQuery.controls['vendor'].setValue([]);
      this.formGroupQuery.controls['vendorMedia'].setValue([]);
      this.formGroupQuery.controls['platform'].setValue([]);
      this.formGroupQuery.controls['format'].setValue([]);
      this.formGroupQuery.controls['budget'].setValue([]);
      this.formGroupQuery.controls['mode'].setValue([]);
      this.formGroupQuery.controls['search'].setValue('');
      this.dataSource.data = [];

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

      const vendorMediaId = params['vendormedia'];
      const add = params['add'];

      if (add) {
        this.newVendorPort(+vendorMediaId);
      }

      const portId = params['port'];
      const property = params['property'];
      const connection = params['connection'];

      if (portId) {
        this.vendorPortAPI.getVendorPort(portId).subscribe(vendorPort => {
          if (property) {
            this.modifyVendorPort(vendorPort, 'property');
          }
          if (connection) {
            this.modifyVendorPort(vendorPort, 'connection');
          }
        });
      }
    });
  }

  mouseenter(row: VendorPort) {
    this.hoverRow = row;
  }

  mouseleave() {
    this.hoverRow = null;
  }

  query() {
    const selectedPlatforms: string[] = this.formGroupQuery.value.platform;
    if (selectedPlatforms.length > 0) {
      this.filterVendorMedia = this.allVendorMedia.filter(vendorMedia => selectedPlatforms.indexOf(vendorMedia.platform) >= 0);
    } else {
      this.filterVendorMedia = this.allVendorMedia;
    }

    this.formQuery = {
      filter: {
        vendorMode: [String(this.mode())],
        vendor: (this.formGroupQuery.value.vendor as Vendor[]).map(vendor => vendor.id!.toString()),
        vendorMedia: (this.formGroupQuery.value.vendorMedia as VendorMedia[]).map(vendorMedia => vendorMedia.id!.toString()),
        platform: this.formGroupQuery.value.platform,
        format: this.formGroupQuery.value.format,
        budget: this.formGroupQuery.value.budget,
        mode: this.formGroupQuery.value.mode,
      },
      searchKey: ['name', 'tagId'],
      searchValue: this.formGroupQuery.value.search,
    };

    this.dataRequest$.next(this.formQuery);
  }

  clear(event: Event, field: string, value: string | unknown[]) {
    event.stopPropagation();
    this.formGroupQuery.patchValue({[field]: value});
    this.query();
  }

  canViewConnection(): boolean {
    return this.tenantService.isTenantManager() || this.tenantService.isTenantOperator() || this.tenantService.isTenantObserver() || this.tenantService.isManager();
  }

  newVendorPort(vendorMediaId: number) {
    const dialogRef = this.dialog.open<VendorPortDialogComponent, VendorPortDialogData>(VendorPortDialogComponent, {
      data: {
        mode: this.mode(),
        tab: 'property',
        vendorMediaId: vendorMediaId,
        vendorPort: null,
      },
      minWidth: '80vw',
      minHeight: '80vh',
      maxWidth: '80vw',
      maxHeight: '80vh',
      width: '80vw',
      height: '80vh',
    });

    dialogRef.afterClosed().subscribe(changed => {
      this.router.navigate([], {
        queryParams: { 'add': null, 'vendormedia': null },
        queryParamsHandling: 'merge'
      });

      if (changed) {
        this.query();
      }
    });
  }

  modifyVendorPort(vendorPort: VendorPort, tab: string) {
    const dialogRef = this.dialog.open<VendorPortDialogComponent, VendorPortDialogData>(VendorPortDialogComponent, {
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

    dialogRef.afterClosed().subscribe(changed => {
      if (changed) {
        this.query();
      }
    });
  }

  getConnectionStatus(vendorPort: VendorPort) {
    return vendorPort.connection.filter(connection => connection.enabled).length > 0;
  }

}
