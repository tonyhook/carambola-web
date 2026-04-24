import { AfterViewInit, Component, effect, OnInit, signal, WritableSignal, inject, viewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { catchError, debounceTime, of, Subject, switchMap } from 'rxjs';

import { PartnerType, Query, Vendor, VendorAPI } from '../../../../core';
import { TenantService } from '../../../../services';
import { AdEntityComponent } from '../../../../shared';
import { VendorDialogComponent, VendorDialogData } from '../vendor-dialog/vendor-dialog.component';

interface VendorQueryControls {
  search: FormControl<string>;
}

@Component({
  selector: 'carambola-vendor-manager',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginator,
    MatPaginatorModule,
    MatSort,
    MatSortModule,
    MatTableModule,
    AdEntityComponent,
  ],
  templateUrl: './vendor.component.html',
  styleUrls: ['./vendor.component.scss'],
})
export class VendorManagerComponent implements OnInit, AfterViewInit {
  private formBuilder = inject(FormBuilder);
  private dialog = inject(MatDialog);
  private vendorAPI = inject(VendorAPI);
  private tenantService = inject(TenantService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  PartnerType = PartnerType;

  displayedColumns: string[] = ['name', 'actions'];
  hoverRow: Vendor | null = null;

  mode: WritableSignal<PartnerType> = signal(PartnerType.PARTNER_TYPE_UNKNOWN);
  formGroupQuery: FormGroup<VendorQueryControls>;
  formQuery: Query<Vendor> = {
    filter: {},
    searchKey: ['name'],
    searchValue: '',
  };

  readonly sort = viewChild(MatSort);
  readonly paginator = viewChild(MatPaginator);

  dataRequest$ = new Subject<Query<Vendor>>();
  dataSource = new MatTableDataSource<Vendor>([]);

  constructor() {
    this.formGroupQuery = this.formBuilder.group({
      search: this.formBuilder.nonNullable.control(''),
    });

    effect(() => {
      const mode = this.mode();
      const tenant = this.tenantService.tenant();

      if (mode === PartnerType.PARTNER_TYPE_UNKNOWN) {
        return;
      }
      if (!tenant) {
        return;
      }

      this.query();
    });
  }

  get searchValue(): string {
    return this.formGroupQuery.controls.search.value;
  }

  ngOnInit() {
    this.dataRequest$.pipe(
      debounceTime(500),
      switchMap(query =>
        this.vendorAPI.getVendorList(query).pipe(
          catchError(() => {
            return of([]);
          })
        )
      ),
    ).subscribe(vendors => {
      this.dataSource.data = vendors.filter(vendor => !vendor.deleted).sort((a, b) => {
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
      this.dataSource.sort = this.sort() ?? null;
      this.dataSource.paginator = this.paginator() ?? null;
    });

    this.formGroupQuery.valueChanges.subscribe(() => {
      this.query();
    })
  }

  ngAfterViewInit() {
    this.route.queryParams.subscribe(params => {
      this.formGroupQuery.controls.search.setValue('');
      this.dataSource.data = [];

      if (params['directMode']) {
        this.mode.set(params['directMode'] === 'true' ? PartnerType.PARTNER_TYPE_DIRECT : PartnerType.PARTNER_TYPE_PROGRAMMATIC);
      } else {
        this.mode.set(PartnerType.PARTNER_TYPE_PROGRAMMATIC);
      }
    });
  }

  mouseenter(row: Vendor) {
    this.hoverRow = row;
  }

  mouseleave() {
    this.hoverRow = null;
  }

  query() {
    this.formQuery = {
      filter: {
        mode: [String(this.mode())],
      },
      searchKey: ['name'],
      searchValue: this.searchValue,
    };

    this.dataRequest$.next(this.formQuery);
  }

  clear(event: Event, field: keyof VendorQueryControls, value: string) {
    event.stopPropagation();
    this.formGroupQuery.patchValue({[field]: value});
    this.query();
  }

  canCreateVendor(): boolean {
    return this.tenantService.isTenantManager() || this.tenantService.isManager();
  }

  canCreateMedia(row: Vendor): boolean {
    return this.tenantService.isTenantManager() || this.tenantService.isManager() || this.tenantService.isVendorManager(row);
  }

  createMedia(row: Vendor, event: MouseEvent) {
    this.router.navigate(['admin', 'ad', 'vendormedia'], { queryParams: { directMode: this.mode() === PartnerType.PARTNER_TYPE_DIRECT, vendor: row.id, add: 'add' }});
    event.stopPropagation();
  }

  newVendor() {
    const dialogRef = this.dialog.open<VendorDialogComponent, VendorDialogData>(VendorDialogComponent, {
      data: {
        mode: this.mode(),
        vendor: null,
      },
      minWidth: '80vw',
      minHeight: '80vh',
      maxWidth: '80vw',
      maxHeight: '80vh',
      width: '80vw',
      height: '80vh',
    });

    dialogRef.afterClosed().subscribe(changed => {
      if (changed) {
        this.query();
      }
    });
  }

  modifyVendor(vendor: Vendor) {
    const dialogRef = this.dialog.open<VendorDialogComponent, VendorDialogData>(VendorDialogComponent, {
      data: {
        mode: this.mode(),
        vendor: vendor,
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
