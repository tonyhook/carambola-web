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

import { Media, MediaAPI, TenantService } from '../..';
import { MediaDialogComponent } from '../media-dialog/media-dialog.component';

interface MediaQueryControls {
  search: FormControl<string>;
}

@Component({
  selector: 'carambola-perf-media-manager',
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
  templateUrl: './media.component.html',
  styleUrls: ['./media.component.scss'],
})
export class MediaManagerComponent implements OnInit, AfterViewInit {
  private formBuilder = inject(FormBuilder);
  private dialog = inject(MatDialog);
  private mediaAPI = inject(MediaAPI);
  tenantService = inject(TenantService);

  displayedColumns: string[] = ['name', 'code', 'actions'];
  hoverRow: Media | null = null;
  formGroupQuery: FormGroup<MediaQueryControls> = this.formBuilder.group({
    search: this.formBuilder.nonNullable.control('', Validators.required),
  });

  readonly sort = viewChild(MatSort);
  readonly paginator = viewChild(MatPaginator);
  dataSource = new MatTableDataSource<Media>([]);

  get searchValue(): string {
    return this.formGroupQuery.controls.search.value;
  }

  ngOnInit() {
    this.formGroupQuery.valueChanges.subscribe(() => this.query());
  }

  ngAfterViewInit() {
    this.query();
  }

  mouseenter(row: Media) {
    this.hoverRow = row;
  }

  mouseleave() {
    this.hoverRow = null;
  }

  query() {
    const search = this.searchValue.toLowerCase();
    this.mediaAPI.getMediaList({filter: {}, searchKey: ['name', 'code'], searchValue: search}).subscribe(mediaList => {
      this.dataSource.data = mediaList.filter(media => !media.deleted);
      this.dataSource.sort = this.sort() ?? null;
      this.dataSource.paginator = this.paginator() ?? null;
    });
  }

  clear(event: Event, field: keyof MediaQueryControls, value: string) {
    event.stopPropagation();
    this.formGroupQuery.patchValue({[field]: value});
    this.query();
  }

  newMedia() {
    this.openDialog(null);
  }

  modifyMedia(media: Media) {
    this.openDialog(media);
  }

  private openDialog(media: Media | null) {
    const dialogRef = this.dialog.open(MediaDialogComponent, {
      data: media,
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
