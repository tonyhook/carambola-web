import { DatePipe, KeyValuePipe } from '@angular/common';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { finalize } from 'rxjs';

import { CountAPI, CountEventQuery } from '../../api';
import { EventView } from '../../entity';
import { formatEventValue, getEventValueLabel } from '../../shared/event-value';

export interface CountEventsDialogData {
  mediaNames: Record<string, string>;
  query: CountEventQuery;
}

@Component({
  selector: 'carambola-perf-count-events-dialog',
  imports: [
    DatePipe,
    KeyValuePipe,
    MatButtonModule,
    MatDialogModule,
    MatPaginatorModule,
  ],
  templateUrl: './count-events-dialog.component.html',
  styleUrls: ['./count-events-dialog.component.scss'],
})
export class CountEventsDialogComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private dialogRef = inject<MatDialogRef<CountEventsDialogComponent>>(MatDialogRef);
  private countAPI = inject(CountAPI);
  data = inject<CountEventsDialogData>(MAT_DIALOG_DATA);

  events: EventView[] = [];
  totalElements = 0;
  pageIndex = 0;
  pageSize = 10;
  loading = false;

  ngOnInit() {
    this.loadPage(0, this.pageSize);
  }

  close() {
    this.dialogRef.close();
  }

  pageChanged(event: PageEvent) {
    this.loadPage(event.pageIndex, event.pageSize);
  }

  private loadPage(page: number, size: number) {
    this.loading = true;
    this.countAPI.getRecentEvents({
      ...this.data.query,
      page,
      size,
    })
      .pipe(
        finalize(() => this.loading = false),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(result => {
        this.events = result.content;
        this.totalElements = result.totalElements;
        this.pageIndex = result.page;
        this.pageSize = result.size;
      });
  }

  getMediaLabel(event: EventView): string {
    if (!event.media) {
      return '';
    }

    const mediaName = this.data.mediaNames[event.media] ?? event.media;
    if (event.media === 'davidia') {
      const operator = event.operator?.trim();
      return operator ? `${mediaName} (${operator})` : mediaName;
    }

    const mediaCode = event.mediaCode?.trim();
    return mediaCode ? `${mediaName} (${mediaCode})` : mediaName;
  }

  getEventValueLabel(event: EventView): string {
    return getEventValueLabel(event.event);
  }

  formatEventValue(event: EventView): string {
    return formatEventValue(event.event, event.amount ?? 0);
  }
}
