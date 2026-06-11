import { AfterViewInit, Component, OnInit, ViewChild, inject } from '@angular/core';
import { UntypedFormGroup, UntypedFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Subject, switchMap } from 'rxjs';
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

import { Authority, AuthorityAPI, Query } from '../../../../core';
import { IsNewPipe } from '../../../../shared';
import { AuthorityDialogComponent } from '../authority-dialog/authority-dialog.component';

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
  private formBuilder = inject(UntypedFormBuilder);
  private dialog = inject(MatDialog);
  private authorityAPI = inject(AuthorityAPI);

  displayedColumns: string[] = ['name', 'actions'];
  hoverRow: Authority | null = null;

  formGroupQuery: UntypedFormGroup;
  formQuery: Query<Authority> = {
    filter: {},
    searchKey: ['name'],
    searchValue: '',
  };

  @ViewChild(MatSort, {static: false}) sort: MatSort | null = null;
  @ViewChild(MatPaginator, {static: false}) paginator: MatPaginator | null = null;

  dataRequest$ = new Subject<Query<Authority>>();
  dataSource = new MatTableDataSource<Authority>([]);

  constructor() {
    this.formGroupQuery = this.formBuilder.group({
      'search': ['', null],
    });
  }

  ngOnInit() {
    this.dataRequest$.pipe(
      switchMap(query => this.authorityAPI.getAuthorityList(query)),
    ).subscribe(authorities => {
      this.dataSource.data = authorities;
      this.dataSource.sort = this.sort;
      this.dataSource.paginator = this.paginator;
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
      searchValue: this.formGroupQuery.value.search,
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
