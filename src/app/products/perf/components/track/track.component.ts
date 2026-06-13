import { AfterViewInit, Component, inject, OnInit, viewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';

import { TenantService, Track, TrackAPI } from '../..';
import { TrackDialogComponent } from '../track-dialog/track-dialog.component';

interface TrackQueryControls {
  search: FormControl<string>;
}

@Component({
  selector: 'carambola-perf-track-manager',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginator,
    MatPaginatorModule,
    MatSort,
    MatSortModule,
    MatTableModule,
  ],
  templateUrl: './track.component.html',
  styleUrls: ['./track.component.scss'],
})
export class TrackManagerComponent implements OnInit, AfterViewInit {
  private formBuilder = inject(FormBuilder);
  private dialog = inject(MatDialog);
  private trackAPI = inject(TrackAPI);
  tenantService = inject(TenantService);

  displayedColumns: string[] = ['name', 'code', 'actions'];
  hoverRow: Track | null = null;
  formGroupQuery: FormGroup<TrackQueryControls> = this.formBuilder.group({
    search: this.formBuilder.nonNullable.control('', Validators.required),
  });

  readonly sort = viewChild(MatSort);
  readonly paginator = viewChild(MatPaginator);
  dataSource = new MatTableDataSource<Track>([]);

  get searchValue(): string {
    return this.formGroupQuery.controls.search.value;
  }

  ngOnInit() {
    this.formGroupQuery.valueChanges.subscribe(() => this.query());
  }

  ngAfterViewInit() {
    this.query();
  }

  mouseenter(row: Track) {
    this.hoverRow = row;
  }

  mouseleave() {
    this.hoverRow = null;
  }

  query() {
    const search = this.searchValue.toLowerCase();
    this.trackAPI.getTrackList({filter: {}, searchKey: ['name', 'code'], searchValue: search}).subscribe(trackList => {
      this.dataSource.data = trackList.filter(track => !track.deleted);
      this.dataSource.sort = this.sort() ?? null;
      this.dataSource.paginator = this.paginator() ?? null;
    });
  }

  clear(event: Event, field: keyof TrackQueryControls, value: string) {
    event.stopPropagation();
    this.formGroupQuery.patchValue({[field]: value});
    this.query();
  }

  newTrack() {
    this.openDialog(null);
  }

  modifyTrack(track: Track) {
    this.openDialog(track);
  }

  private openDialog(track: Track | null) {
    const dialogRef = this.dialog.open(TrackDialogComponent, {
      data: track,
      minWidth: '560px',
      maxWidth: '80vw',
      width: '560px',
    });
    dialogRef.afterClosed().subscribe(changed => {
      if (changed) {
        this.query();
      }
    });
  }
}
