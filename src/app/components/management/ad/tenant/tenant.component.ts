import { AfterViewInit, Component, OnInit, ViewChild, inject } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
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

import { Query, Tenant, TenantAPI } from '../../../../core';
import { IsNewPipe } from '../../../../shared';
import { TenantDialogComponent } from '../tenant-dialog/tenant-dialog.component';

@Component({
  selector: 'carambola-tenant-manager',
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
  private formBuilder = inject(UntypedFormBuilder);
  private dialog = inject(MatDialog);
  private tenantAPI = inject(TenantAPI);

  displayedColumns: string[] = ['name', 'actions'];
  hoverRow: Tenant | null = null;

  formGroupQuery: UntypedFormGroup;
  formQuery: Query<Tenant> = {
    filter: {},
    searchKey: ['name'],
    searchValue: '',
  };

  @ViewChild(MatSort, {static: false}) sort: MatSort | null = null;
  @ViewChild(MatPaginator, {static: false}) paginator: MatPaginator | null = null;

  dataRequest$ = new Subject<Query<Tenant>>();
  dataSource = new MatTableDataSource<Tenant>([]);

  constructor() {
    this.formGroupQuery = this.formBuilder.group({
      'search': ['', null],
    });
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
      this.dataSource.sort = this.sort;
      this.dataSource.paginator = this.paginator;
    });

    this.formGroupQuery.valueChanges.subscribe(() => {
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
      searchValue: this.formGroupQuery.value.search,
    };

    this.dataRequest$.next(this.formQuery);
  }

  clear(event: Event, field: string, value: string | unknown[]) {
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
      height: '80vh',
    });

    dialogRef.afterClosed().subscribe(changed => {
      if (changed) {
        this.query();
      }
    });
  }

  modifyTenant(tenant: Tenant) {
    const dialogRef = this.dialog.open(TenantDialogComponent, {
      data: tenant,
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
