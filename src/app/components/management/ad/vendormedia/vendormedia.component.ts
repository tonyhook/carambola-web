import { AfterViewInit, Component, effect, OnInit, signal, ViewChild, WritableSignal, inject } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
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

import { Vendor, VendorAPI, VendorMedia, VendorMediaAPI, PartnerType, Query } from '../../../../core';
import { AdEntityComponent, FilteredSelectVendorComponent } from '../../../../shared';
import { TenantService } from '../../../../services';
import { VendorMediaDialogComponent, VendorMediaDialogData } from '../vendormedia-dialog/vendormedia-dialog.component';

interface VendorMediaQueryControls {
  vendor: FormControl<Vendor[]>;
  platform: FormControl<string[]>;
  search: FormControl<string>;
}

@Component({
  selector: 'carambola-vendormedia-manager',
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
  ],
  templateUrl: './vendormedia.component.html',
  styleUrls: ['./vendormedia.component.scss'],
})
export class VendorMediaManagerComponent implements OnInit, AfterViewInit {
  private formBuilder = inject(FormBuilder);
  private dialog = inject(MatDialog);
  private tenantService = inject(TenantService);
  private vendorAPI = inject(VendorAPI);
  private vendorMediaAPI = inject(VendorMediaAPI);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  displayedColumns: string[] = ['vendor', 'name', 'appversion', 'applink', 'actions'];
  hoverRow: VendorMedia | null = null;

  mode: WritableSignal<PartnerType> = signal(PartnerType.PARTNER_TYPE_UNKNOWN);
  formGroupQuery: FormGroup<VendorMediaQueryControls>;
  filterVendor: Vendor[] = [];
  filterPlatform: Map<string, string>;
  formQuery: Query<VendorMedia> = {
    filter: {},
    searchKey: ['name', 'apppackage'],
    searchValue: '',
  };

  @ViewChild(MatSort, {static: false}) sort: MatSort | null = null;
  @ViewChild(MatPaginator, {static: false}) paginator: MatPaginator | null = null;

  dataRequest$ = new Subject<Query<VendorMedia>>();
  dataSource = new MatTableDataSource<VendorMedia>([]);

  constructor() {
    this.formGroupQuery = this.formBuilder.group({
      vendor: this.formBuilder.nonNullable.control<Vendor[]>([]),
      platform: this.formBuilder.nonNullable.control<string[]>([]),
      search: this.formBuilder.nonNullable.control(''),
    });

    this.filterPlatform = new Map([
      ['iOS', 'iOS'],
      ['Android', 'Android'],
      ['Web', 'Web'],
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
          mode: [String(this.mode())],
        },
        searchKey: [],
        searchValue: '',
      }).subscribe(vendors => {
        vendors = vendors.filter(vendor => !vendor.deleted);
        this.filterVendor = vendors;
      });

      this.query();
    });
  }

  get selectedVendors(): Vendor[] {
    return this.formGroupQuery.controls.vendor.value;
  }

  get selectedPlatforms(): string[] {
    return this.formGroupQuery.controls.platform.value;
  }

  get searchValue(): string {
    return this.formGroupQuery.controls.search.value;
  }

  ngOnInit() {
    this.dataRequest$.pipe(
      debounceTime(500),
      switchMap(query =>
        this.vendorMediaAPI.getVendorMediaList(query).pipe(
          catchError(() => {
            return of([]);
          })
        )
      ),
    ).subscribe(vendorMedias => {
      this.dataSource.data = vendorMedias.filter(vendorMedia => !vendorMedia.deleted).sort((a, b) => {
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
    });
  }

  ngAfterViewInit() {
    this.route.queryParams.subscribe(params => {
      this.formGroupQuery.controls.vendor.setValue([]);
      this.formGroupQuery.controls.platform.setValue([]);
      this.formGroupQuery.controls.search.setValue('');
      this.dataSource.data = [];

      if (params['directMode']) {
        this.mode.set(params['directMode'] === 'true' ? PartnerType.PARTNER_TYPE_DIRECT : PartnerType.PARTNER_TYPE_PROGRAMMATIC);
      } else {
        this.mode.set(PartnerType.PARTNER_TYPE_PROGRAMMATIC);
      }

      const vendorId = params['vendor'];
      const add = params['add'];

      if (add) {
        this.newVendorMedia(+vendorId);
      }
    });

    this.formGroupQuery.valueChanges.subscribe(() => {
      this.query();
    })
  }

  mouseenter(row: VendorMedia) {
    this.hoverRow = row;
  }

  mouseleave() {
    this.hoverRow = null;
  }

  query() {
    this.formQuery = {
      filter: {
        vendorMode: [String(this.mode())],
        vendor: this.selectedVendors.map(vendor => vendor.id!.toString()),
        platform: this.selectedPlatforms,
      },
      searchKey: ['name', 'apppackage'],
      searchValue: this.searchValue,
    };

    this.dataRequest$.next(this.formQuery);
  }

  clear(
    event: Event,
    field: keyof VendorMediaQueryControls,
    value: string | Vendor[] | string[]
  ) {
    event.stopPropagation();
    this.formGroupQuery.patchValue({[field]: value});
    this.query();
  }

  canCreatePort(row: VendorMedia): boolean {
    return this.tenantService.isTenantManager() || this.tenantService.isManager() || this.tenantService.isVendorManager(row.vendor);
  }

  createPort(row: VendorMedia, event: MouseEvent) {
    this.router.navigate(['admin', 'ad', 'vendorport'], { queryParams: { directMode: this.mode() === PartnerType.PARTNER_TYPE_DIRECT, vendormedia: row.id, add: 'add' }});
    event.stopPropagation();
  }

  newVendorMedia(vendorId: number) {
    const dialogRef = this.dialog.open<VendorMediaDialogComponent, VendorMediaDialogData>(VendorMediaDialogComponent, {
      data: {
        mode: this.mode(),
        vendorId: vendorId,
        vendorMedia: null,
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
        queryParams: { 'add': null, 'vendor': null },
        queryParamsHandling: 'merge'
      });

      if (changed) {
        this.query();
      }
    });
  }

  modifyVendorMedia(vendorMedia: VendorMedia) {
    const dialogRef = this.dialog.open<VendorMediaDialogComponent, VendorMediaDialogData>(VendorMediaDialogComponent, {
      data: {
        mode: this.mode(),
        vendorId: 0,
        vendorMedia: vendorMedia,
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

}
