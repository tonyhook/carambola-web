import { AfterViewInit, Component, DestroyRef, inject, OnInit, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { catchError, debounceTime, of, Subject, switchMap } from 'rxjs';

import { IsNewPipe } from '../../../../shared';
import { PerfQuery, Tenant, TenantAPI, TenantService } from '../..';
import { TenantDialogComponent } from '../tenant-dialog/tenant-dialog.component';

interface TenantQueryControls {
  search: FormControl<string>;
}

@Component({
  selector: 'carambola-perf-tenant-manager',
  imports: [
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatBadgeModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginator,
    MatPaginatorModule,
    MatSort,
    MatSortModule,
    MatTableModule,
    MatTabsModule,
    IsNewPipe,
  ],
  templateUrl: './tenant.component.html',
  styleUrls: ['./tenant.component.scss'],
})
export class TenantManagerComponent implements OnInit, AfterViewInit {
  private destroyRef = inject(DestroyRef);
  private formBuilder = inject(FormBuilder);
  private dialog = inject(MatDialog);
  private tenantAPI = inject(TenantAPI);
  tenantService = inject(TenantService);

  displayedColumns: string[] = ['name', 'actions'];
  hoverRow: Tenant | null = null;

  formGroupQuery: FormGroup<TenantQueryControls>;
  formQuery: PerfQuery<Tenant> = {
    filter: {},
    searchKey: ['name'],
    searchValue: '',
  };

  readonly sort = viewChild(MatSort);
  readonly paginator = viewChild(MatPaginator);

  dataRequest$ = new Subject<PerfQuery<Tenant>>();
  dataSource = new MatTableDataSource<Tenant>([]);

  constructor() {
    this.formGroupQuery = this.formBuilder.group({
      search: this.formBuilder.nonNullable.control(''),
    });
  }

  get searchValue(): string {
    return this.formGroupQuery.controls.search.value;
  }

  ngOnInit() {
    this.dataRequest$.pipe(
      debounceTime(500),
      switchMap(query =>
        this.tenantAPI.getTenantList(query).pipe(
          catchError(() => {
            return of([]);
          })
        )
      ),
    ).subscribe(tenants => {
      this.dataSource.data = tenants.sort((a, b) => {
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

    this.formGroupQuery.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.query();
    })
  }

  ngAfterViewInit() {
    this.query();
  }

  mouseenter(row: Tenant) {
    this.hoverRow = row;
  }

  mouseleave() {
    this.hoverRow = null;
  }

  query() {
    this.formQuery = {
      filter: {},
      searchKey: ['name'],
      searchValue: this.searchValue,
    };

    this.dataRequest$.next(this.formQuery);
  }

  clear(event: Event, field: keyof TenantQueryControls, value: string) {
    event.stopPropagation();
    this.formGroupQuery.patchValue({[field]: value});
    this.query();
  }

  newTenant() {
    const dialogRef = this.dialog.open(TenantDialogComponent, {
      data: null,
      minWidth: '80vw',
      minHeight: '80vh',
      maxWidth: '80vw',
      maxHeight: '80vh',
      width: '80vw',
    });

    dialogRef.afterClosed().subscribe(changed => {
      if (changed) {
        this.query();
      }
    });
  }

  canModifyTenant(): boolean {
    return this.tenantService.isManager();
  }

  modifyTenant(tenant: Tenant) {
    if (!this.canModifyTenant()) {
      return;
    }

    const dialogRef = this.dialog.open(TenantDialogComponent, {
      data: tenant,
      minWidth: '80vw',
      minHeight: '80vh',
      maxWidth: '80vw',
      maxHeight: '80vh',
      width: '80vw',
    });

    dialogRef.afterClosed().subscribe(changed => {
      if (changed) {
        this.query();
      }
    });
  }

}
