import { AfterViewInit, Component, DoCheck, KeyValueDiffer, KeyValueDiffers, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';

import { Log, LogAPI, PaginatedDataSource, Query, Sort } from '../../../../core';

@Component({
  selector: 'carambola-log-manager',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatPaginator,
    MatPaginatorModule,
    MatSort,
    MatSortModule,
    MatTableModule,
  ],
  templateUrl: './log.component.html',
  styleUrls: ['./log.component.scss'],
})
export class LogManagerComponent implements AfterViewInit, DoCheck {
  displayedColumns: string[] = ['createTime', 'level', 'username', 'requestMethod', 'requestResourceType', 'requestResourceId', 'responseCode'];
  initialSort: Sort<Log> = {property: 'createTime', order: 'asc'};
  initialQuery: Partial<Query<Log>> = {};
  initialSize = 10;
  @ViewChild(MatSort, {static: true}) sort: MatSort | undefined;
  @ViewChild(MatPaginator) paginator: MatPaginator | undefined;

  clear: UntypedFormGroup;
  range: UntypedFormGroup;
  differ: KeyValueDiffer<string, unknown>;

  data = new PaginatedDataSource<Log, Query<Log>>(
    (request, query) => this.logAPI.getLogList(request, query),
    this.initialSort,
    this.initialQuery,
    this.initialSize,
  );

  constructor(
    private readonly differs: KeyValueDiffers,
    private logAPI: LogAPI,
  ) {
    this.clear = new UntypedFormGroup({
      clear: new UntypedFormControl()
    });
    this.range = new UntypedFormGroup({
      start: new UntypedFormControl(),
      end: new UntypedFormControl(),
    });
      this.differ = this.differs.find(this.range.value).create();
  }

  ngAfterViewInit() {
    if (this.sort) {
      this.sort.sortChange.subscribe(sort => {
        if (sort.direction === '') {
          sort.active = this.initialSort.property;
          sort.direction = this.initialSort.order;
        }
        this.data.sortBy({property: sort.active as keyof Log, order: sort.direction});
      });
    }
    this.differ = this.differs.find(this.range.value).create();
    this.clear.setValue({clear: false});
  }

  ngDoCheck(): void {
    const changes = this.differ.diff(this.range.value);
    if (changes) {
      if (this.range.value.start && this.range.value.end) {
        this.data.queryBy({
          start: new Date(Date.parse(this.range.value.start)).toISOString(),
          end: new Date(Date.parse(this.range.value.end) + 86400000).toISOString()
        });
      }
    }
  }

  download() {
    let range: Query<Log> | null = null;

    if (this.range.value.start && this.range.value.end) {
      range = {
        start: new Date(Date.parse(this.range.value.start)).toISOString(),
        end: new Date(Date.parse(this.range.value.end) + 86400000).toISOString()
      };
    }

    this.logAPI.download(range, this.clear.value.clear).subscribe(data => {
      const contentType = 'application/vnd.ms-excel';
      const blob = new Blob([data], { type: contentType });
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = 'log.xlsx';
      a.click();

      window.URL.revokeObjectURL(url);

      this.data.fetch();
    });
  }

}
