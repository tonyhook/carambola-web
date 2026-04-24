import { AfterViewInit, Component, OnInit, inject, viewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subject, switchMap } from 'rxjs';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';

import { Query, Role, RoleAPI } from '../../../../core';
import { IsNewPipe } from '../../../../shared';
import { RoleDialogComponent } from '../role-dialog/role-dialog.component';

type RoleQueryFormGroup = FormGroup<{
  search: FormControl<string>;
}>;

@Component({
  selector: 'carambola-role-manager',
  imports: [
    ReactiveFormsModule,
    MatBadgeModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginator,
    MatPaginatorModule,
    MatSelectModule,
    MatSort,
    MatSortModule,
    MatTableModule,
    MatTabsModule,
    IsNewPipe,
  ],
  templateUrl: './role.component.html',
  styleUrls: ['./role.component.scss'],
})
export class RoleManagerComponent implements OnInit, AfterViewInit {
  private formBuilder = inject(FormBuilder);
  private dialog = inject(MatDialog);
  private roleAPI = inject(RoleAPI);

  displayedColumns: string[] = ['name', 'actions'];
  hoverRow: Role | null = null;

  formGroupQuery: RoleQueryFormGroup;
  formQuery: Query<Role> = {
    filter: {},
    searchKey: ['name'],
    searchValue: '',
  };

  readonly sort = viewChild(MatSort);
  readonly paginator = viewChild(MatPaginator);

  dataRequest$ = new Subject<Query<Role>>();
  dataSource = new MatTableDataSource<Role>([]);

  constructor() {
    this.formGroupQuery = this.formBuilder.group({
      search: this.formBuilder.nonNullable.control(''),
    });
  }

  ngOnInit() {
    this.dataRequest$.pipe(
      switchMap(query => this.roleAPI.getRoleList(query)),
    ).subscribe(roles => {
      this.dataSource.data = roles;
      this.dataSource.sort = this.sort() ?? null;
      this.dataSource.paginator = this.paginator() ?? null;
    });
  }

  ngAfterViewInit() {
    this.query();
  }

  mouseenter(row: Role) {
    this.hoverRow = row;
  }

  mouseleave() {
    this.hoverRow = null;
  }

  query() {
    this.formQuery = {
      filter: {},
      searchKey: ['name'],
      searchValue: this.formGroupQuery.controls.search.value,
    };

    this.dataRequest$.next(this.formQuery);
  }

  clear(event: Event, field: string, value: string | unknown[]) {
    event.stopPropagation();
    this.formGroupQuery.patchValue({[field]: value});
    this.query();
  }

  newRole() {
    const dialogRef = this.dialog.open(RoleDialogComponent, {
      data: null,
    });

    dialogRef.afterClosed().subscribe(changed => {
      if (changed) {
        this.query();
      }
    });
  }

  modifyRole(role: Role) {
    const dialogRef = this.dialog.open(RoleDialogComponent, {
      data: role,
    });

    dialogRef.afterClosed().subscribe(changed => {
      if (changed) {
        this.query();
      }
    });
  }

}
