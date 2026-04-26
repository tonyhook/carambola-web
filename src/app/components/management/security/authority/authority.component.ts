import { AfterViewInit, Component, inject, OnInit, viewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { Subject, switchMap } from 'rxjs';

import { Authority, AuthorityAPI, Query } from '../../../../core';
import { IsNewPipe } from '../../../../shared';
import { AuthorityDialogComponent } from '../authority-dialog/authority-dialog.component';

type AuthorityQueryFormGroup = FormGroup<{
  search: FormControl<string>;
}>;

@Component({
  selector: 'carambola-authority-manager',
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
    MatSort,
    MatSortModule,
    MatTableModule,
    MatTabsModule,
    IsNewPipe,
  ],
  templateUrl: './authority.component.html',
  styleUrls: ['./authority.component.scss'],
})
export class AuthorityManagerComponent implements OnInit, AfterViewInit {
  private formBuilder = inject(FormBuilder);
  private dialog = inject(MatDialog);
  private authorityAPI = inject(AuthorityAPI);

  displayedColumns: string[] = ['name', 'actions'];
  hoverRow: Authority | null = null;

  formGroupQuery: AuthorityQueryFormGroup;
  formQuery: Query<Authority> = {
    filter: {},
    searchKey: ['name'],
    searchValue: '',
  };

  readonly sort = viewChild(MatSort);
  readonly paginator = viewChild(MatPaginator);

  dataRequest$ = new Subject<Query<Authority>>();
  dataSource = new MatTableDataSource<Authority>([]);

  constructor() {
    this.formGroupQuery = this.formBuilder.group({
      search: this.formBuilder.nonNullable.control(''),
    });
  }

  ngOnInit() {
    this.dataRequest$.pipe(
      switchMap(query => this.authorityAPI.getAuthorityList(query)),
    ).subscribe(authorities => {
      this.dataSource.data = authorities;
      this.dataSource.sort = this.sort() ?? null;
      this.dataSource.paginator = this.paginator() ?? null;
    });
  }

  ngAfterViewInit() {
    this.query();
  }

  mouseenter(row: Authority) {
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

  newAuthority() {
    const dialogRef = this.dialog.open(AuthorityDialogComponent, {
      data: null,
    });

    dialogRef.afterClosed().subscribe(changed => {
      if (changed) {
        this.query();
      }
    });
  }

  modifyAuthority(authority: Authority) {
    const dialogRef = this.dialog.open(AuthorityDialogComponent, {
      data: authority,
    });

    dialogRef.afterClosed().subscribe(changed => {
      if (changed) {
        this.query();
      }
    });
  }

}
