import { AfterViewInit, Component, DestroyRef, DoCheck, inject, KeyValueDiffer, KeyValueDiffers, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';

import { Log, LogAPI, PaginatedDataSource, Query, Sort } from '../../../../core';

type LogClearFormGroup = FormGroup<{
  clear: FormControl<boolean | null>;
}>;

type LogRangeFormGroup = FormGroup<{
  start: FormControl<Date | null>;
  end: FormControl<Date | null>;
}>;

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
  private destroyRef = inject(DestroyRef);
  private readonly differs = inject(KeyValueDiffers);
  private logAPI = inject(LogAPI);

  displayedColumns: string[] = ['createTime', 'level', 'username', 'requestMethod', 'requestResourceType', 'requestResourceId', 'responseCode'];
  initialSort: Sort<Log> = {property: 'createTime', order: 'asc'};
  initialQuery: Partial<Query<Log>> = {};
  initialSize = 10;
  readonly sort = viewChild(MatSort);
  readonly paginator = viewChild(MatPaginator);

  clear: LogClearFormGroup;
  range: LogRangeFormGroup;
  differ: KeyValueDiffer<string, Date | null>;

  data = new PaginatedDataSource<Log, Query<Log>>(
    (request, query) => this.logAPI.getLogList(request, query),
    this.initialSort,
    this.initialQuery,
    this.initialSize,
  );

  constructor() {
    this.clear = new FormGroup({
      clear: new FormControl<boolean | null>(null),
    });
    this.range = new FormGroup({
      start: new FormControl<Date | null>(null),
      end: new FormControl<Date | null>(null),
    });
    this.differ = this.differs.find(this.range.getRawValue()).create();
  }

  ngAfterViewInit() {
    const sortValue = this.sort();
    if (sortValue) {
      sortValue.sortChange.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(sort => {
        if (sort.direction === '') {
          sort.active = this.initialSort.property;
          sort.direction = this.initialSort.order;
        }
        this.data.sortBy({property: sort.active as keyof Log, order: sort.direction});
      });
    }
    this.differ = this.differs.find(this.range.getRawValue()).create();
    this.clear.setValue({clear: false});
  }

  ngDoCheck(): void {
    const range = this.range.getRawValue();
    const changes = this.differ.diff(range);
    if (changes) {
      if (range.start && range.end) {
        this.data.queryBy({
          start: range.start.toISOString(),
          end: new Date(range.end.getTime() + 86400000).toISOString()
        });
      }
    }
  }

  download() {
    let range: Query<Log> | null = null;
    const selectedRange = this.range.getRawValue();

    if (selectedRange.start && selectedRange.end) {
      range = {
        start: selectedRange.start.toISOString(),
        end: new Date(selectedRange.end.getTime() + 86400000).toISOString()
      };
    }

    this.logAPI.download(range, !!this.clear.controls.clear.value).subscribe(data => {
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
