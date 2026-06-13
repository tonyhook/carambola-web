import { AfterViewInit, Component, DestroyRef, inject, OnInit, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { catchError, debounceTime, of, Subject, switchMap } from 'rxjs';

import { IsNewPipe } from '../../../../shared';
import { ClientProject, ClientProjectAPI, PerfQuery, TenantService } from '../..';
import { ClientProjectDialogComponent } from '../client-project-dialog/client-project-dialog.component';

interface ClientProjectQueryControls {
  search: FormControl<string>;
}

@Component({
  selector: 'carambola-perf-client-project-manager',
  imports: [ReactiveFormsModule, MatBadgeModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatPaginator, MatPaginatorModule, MatSort, MatSortModule, MatTableModule, IsNewPipe],
  templateUrl: './client-project.component.html',
  styleUrls: ['./client-project.component.scss'],
})
export class ClientProjectManagerComponent implements OnInit, AfterViewInit {
  private destroyRef = inject(DestroyRef);
  private formBuilder = inject(FormBuilder);
  private dialog = inject(MatDialog);
  private clientProjectAPI = inject(ClientProjectAPI);
  tenantService = inject(TenantService);

  displayedColumns: string[] = ['name', 'client', 'actions'];
  hoverRow: ClientProject | null = null;
  formGroupQuery: FormGroup<ClientProjectQueryControls> = this.formBuilder.group({search: this.formBuilder.nonNullable.control('')});
  formQuery: PerfQuery<ClientProject> = {filter: {}, searchKey: ['name'], searchValue: ''};
  readonly sort = viewChild(MatSort);
  readonly paginator = viewChild(MatPaginator);
  dataRequest$ = new Subject<PerfQuery<ClientProject>>();
  dataSource = new MatTableDataSource<ClientProject>([]);

  get searchValue(): string { return this.formGroupQuery.controls.search.value; }

  ngOnInit() {
    this.dataRequest$.pipe(debounceTime(500), switchMap(query => this.clientProjectAPI.getClientProjectList(query).pipe(catchError(() => of([]))))).subscribe(projects => {
      this.dataSource.data = projects.filter(project => !project.deleted).sort((a, b) => this.compareUpdateTime(a.updateTime, b.updateTime));
      this.dataSource.sort = this.sort() ?? null;
      this.dataSource.paginator = this.paginator() ?? null;
    });
    this.formGroupQuery.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.query());
  }

  ngAfterViewInit() { this.query(); }
  mouseenter(row: ClientProject) { this.hoverRow = row; }
  mouseleave() { this.hoverRow = null; }
  query() { this.formQuery = {filter: {}, searchKey: ['name'], searchValue: this.searchValue}; this.dataRequest$.next(this.formQuery); }
  clear(event: Event, field: keyof ClientProjectQueryControls, value: string) { event.stopPropagation(); this.formGroupQuery.patchValue({[field]: value}); this.query(); }
  newClientProject() { this.openDialog(null); }
  modifyClientProject(project: ClientProject) { this.openDialog(project); }

  private openDialog(project: ClientProject | null) {
    const dialogRef = this.dialog.open(ClientProjectDialogComponent, {data: project, minWidth: '720px', maxWidth: '80vw', width: '720px'});
    dialogRef.afterClosed().subscribe(changed => { if (changed) { this.query(); } });
  }

  private compareUpdateTime(a: string | null, b: string | null): number {
    const keya = a ? new Date(a) : new Date(0);
    const keyb = b ? new Date(b) : new Date(0);
    return keya < keyb ? 1 : keya > keyb ? -1 : 0;
  }
}
