import { DataSource } from '@angular/cdk/collections';
import { Observable } from 'rxjs';

import { PageEvent } from '@angular/material/paginator';
import { computed, effect, Signal, signal, WritableSignal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';

export interface Sort<T> {
  property: keyof T;
  order: 'asc' | 'desc';
}

export interface PageRequest<T> {
  page: number;
  size: number;
  sort: Sort<T> | null;
}

export interface Paginator {
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface Page<T> {
  content: T[];
  page: Paginator;
}

export type PaginatedEndpoint<T, Q> = (req: PageRequest<T>, query: Q) => Observable<Page<T>>;

export class PaginatedDataSource<T, Q> implements DataSource<T> {
  request: WritableSignal<{page: number; size: number; sort: Sort<T> | null}>;
  query: WritableSignal<Q>;

  data: WritableSignal<Page<T>>;
  content: Signal<T[]>;

  constructor(
    private endpoint: PaginatedEndpoint<T, Q>,
    private initialSort: Sort<T>,
    private initialQuery: Q,
    private initialSize: number,
  ) {
    this.request = signal({
      page: 0,
      size: this.initialSize,
      sort: this.initialSort,
    });
    this.query = signal(this.initialQuery);

    this.data = signal({
      content: [],
      page: {
        totalElements: 0,
        totalPages: 0,
        size: this.initialSize,
        number: 0,
      },
    });

    this.content = computed(() => {
      const page = this.data();
      return page.content;
    });

    effect(() => {
      const request = this.request();
      const query = this.query();

      this.endpoint({
        page: request.page,
        size: request.size,
        sort: request.sort
      }, query).subscribe((page) => {
        if (page.page.number >= page.page.totalPages) {
          page.page.number = page.page.totalPages - 1;
        }
        this.data.set(page);
      });
    });
  }

  sortBy(sort: Sort<T>): void {
    const request = this.request();
    const lastSort = request.sort;
    const nextSort = {...lastSort, ...sort};
    this.request.set({...request, sort: nextSort});
  }

  queryBy(query: Partial<Q>): void {
    const lastQuery = this.query();
    const nextQuery = {...lastQuery, ...query};
    this.query.set(nextQuery);
  }

  fetch(page?: PageEvent): void {
    const request = this.request();
    if (page) {
      this.request.set({...request, page: page.pageIndex, size: page.pageSize});
    } else {
      this.request.set({...request, page: 0, size: this.initialSize});
    }
  }

  connect(): Observable<T[]> {
    return toObservable(this.content);
  }

  disconnect(): void {
    return;
  }

}
