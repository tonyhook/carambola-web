import { Component, DestroyRef, effect, inject, OnInit, viewChild } from '@angular/core';
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
import { debounceTime, Subject, switchMap } from 'rxjs';

import { IsNewPipe } from '../../../../shared';
import { Client, ClientAPI, PerfQuery, TenantService } from '../..';
import { ClientDialogComponent } from '../client-dialog/client-dialog.component';

interface ClientQueryControls {
  search: FormControl<string>;
}

@Component({
  selector: 'carambola-perf-client-manager',
  imports: [
    ReactiveFormsModule,
    MatBadgeModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginator,
    MatPaginatorModule,
    MatSort,
    MatSortModule,
    MatTableModule,
    IsNewPipe,
  ],
  templateUrl: './client.component.html',
  styleUrls: ['./client.component.scss'],
})
export class ClientManagerComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private formBuilder = inject(FormBuilder);
  private dialog = inject(MatDialog);
  private clientAPI = inject(ClientAPI);
  tenantService = inject(TenantService);

  displayedColumns: string[] = ['name', 'actions'];
  hoverRow: Client | null = null;

  formGroupQuery: FormGroup<ClientQueryControls>;
  formQuery: PerfQuery<Client> = {
    filter: {},
    searchKey: ['name'],
    searchValue: '',
  };

  readonly sort = viewChild(MatSort);
  readonly paginator = viewChild(MatPaginator);

  dataRequest$ = new Subject<PerfQuery<Client>>();
  dataSource = new MatTableDataSource<Client>([]);

  constructor() {
    this.formGroupQuery = this.formBuilder.group({
      search: this.formBuilder.nonNullable.control(''),
    });

    effect(() => {
      const tenant = this.tenantService.tenant();
      if (!tenant && !this.tenantService.isManager()) {
        return;
      }

      this.query();
    });
  }

  get searchValue(): string {
    return this.formGroupQuery.controls.search.value;
  }

  ngOnInit() {
    this.dataRequest$.pipe(
      debounceTime(500),
      switchMap(query => this.clientAPI.getClientList(query)),
    ).subscribe(clients => {
      this.dataSource.data = clients.filter(client => !client.deleted).sort((a, b) => this.compareUpdateTime(a.updateTime, b.updateTime));
      this.dataSource.sort = this.sort() ?? null;
      this.dataSource.paginator = this.paginator() ?? null;
    });

    this.formGroupQuery.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.query());
  }

  mouseenter(row: Client) {
    this.hoverRow = row;
  }

  mouseleave() {
    this.hoverRow = null;
  }

  query() {
    this.formQuery = {
      filter: {},
      searchKey: ['name'],
      searchValue: this.searchValue,
    };

    this.dataRequest$.next(this.formQuery);
  }

  clear(event: Event, field: keyof ClientQueryControls, value: string) {
    event.stopPropagation();
    this.formGroupQuery.patchValue({[field]: value});
    this.query();
  }

  newClient() {
    const dialogRef = this.dialog.open(ClientDialogComponent, {
      data: null,
      minWidth: '720px',
      maxWidth: '80vw',
      width: '720px',
    });

    dialogRef.afterClosed().subscribe(changed => {
      if (changed) {
        this.query();
      }
    });
  }

  canModifyClient(): boolean {
    return this.tenantService.isTenantManager()
      || this.tenantService.isManager();
  }

  modifyClient(client: Client) {
    if (!this.canModifyClient()) {
      return;
    }

    const dialogRef = this.dialog.open(ClientDialogComponent, {
      data: client,
      minWidth: '720px',
      maxWidth: '80vw',
      width: '720px',
    });

    dialogRef.afterClosed().subscribe(changed => {
      if (changed) {
        this.query();
      }
    });
  }

  private compareUpdateTime(a: string | null, b: string | null): number {
    const keya = a ? new Date(a) : new Date(0);
    const keyb = b ? new Date(b) : new Date(0);
    return keya < keyb ? 1 : keya > keyb ? -1 : 0;
  }
}
