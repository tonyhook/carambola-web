import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
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
import { MatSelectModule } from '@angular/material/select';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';

import { Query, User, UserAPI } from '../../../../core';
import { IsNewPipe } from '../../../../shared';
import { UserDialogComponent } from '../user-dialog/user-dialog.component';

@Component({
  selector: 'carambola-user-manager',
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
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.scss'],
})
export class UserManagerComponent implements OnInit, AfterViewInit {
  displayedColumns: string[] = ['username', 'actions'];
  hoverRow: User | null = null;

  formGroupQuery: UntypedFormGroup;
  formQuery: Query<User> = {
    filter: {},
    searchKey: ['username'],
    searchValue: '',
  };

  @ViewChild(MatSort, {static: false}) sort: MatSort | null = null;
  @ViewChild(MatPaginator, {static: false}) paginator: MatPaginator | null = null;

  dataRequest$ = new Subject<Query<User>>();
  dataSource = new MatTableDataSource<User>([]);

  constructor(
    private formBuilder: UntypedFormBuilder,
    private dialog: MatDialog,
    private userAPI: UserAPI,
  ) {
    this.formGroupQuery = this.formBuilder.group({
      'search': ['', null],
    });
  }

  ngOnInit() {
    this.dataRequest$.pipe(
      switchMap(query => this.userAPI.getUserList(query)),
    ).subscribe(users => {
      this.dataSource.data = users;
      this.dataSource.sort = this.sort;
      this.dataSource.paginator = this.paginator;
    });
  }

  ngAfterViewInit() {
    this.query();
  }

  mouseenter(row: User) {
    this.hoverRow = row;
  }

  mouseleave() {
    this.hoverRow = null;
  }

  query() {
    this.formQuery = {
      filter: {},
      searchKey: ['username'],
      searchValue: this.formGroupQuery.value.search,
    };

    this.dataRequest$.next(this.formQuery);
  }

  clear(event: Event, field: string, value: string | unknown[]) {
    event.stopPropagation();
    this.formGroupQuery.patchValue({[field]: value});
    this.query();
  }

  newUser() {
    const dialogRef = this.dialog.open(UserDialogComponent, {
      data: null,
    });

    dialogRef.afterClosed().subscribe(changed => {
      if (changed) {
        this.query();
      }
    });
  }

  modifyUser(user: User) {
    const dialogRef = this.dialog.open(UserDialogComponent, {
      data: user,
    });

    dialogRef.afterClosed().subscribe(changed => {
      if (changed) {
        this.query();
      }
    });
  }

}
