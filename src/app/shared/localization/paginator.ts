import { Injectable } from '@angular/core';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { Subject } from 'rxjs';

@Injectable()
export class CarambolaMatPaginatorIntl implements MatPaginatorIntl {
  changes = new Subject<void>();

  // For internationalization, the `$localize` function from
  // the `@angular/localize` package can be used.
  firstPageLabel = $localize`第一页`;
  itemsPerPageLabel = $localize`每页条目数`;
  lastPageLabel = $localize`最后一页`;

  // You can set labels to an arbitrary string too, or dynamically compute
  // it through other third-party internationalization libraries.
  nextPageLabel = '下一页';
  previousPageLabel = '前一页';

  getRangeLabel(page: number, pageSize: number, length: number): string {
    if (length === 0 || pageSize === 0) {
      return `没有记录`;
    }

    length = Math.max(length, 0);

    const startIndex = page * pageSize;

    // If the start index exceeds the list length, do not try and fix the end index to the end.
    const endIndex =
      startIndex < length ? Math.min(startIndex + pageSize, length) : startIndex + pageSize;

    return `${startIndex + 1} – ${endIndex}，共${length}条`;
  }

}
