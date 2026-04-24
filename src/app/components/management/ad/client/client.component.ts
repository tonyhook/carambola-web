import { AfterViewInit, Component, effect, OnInit, signal, WritableSignal, inject, viewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { catchError, debounceTime, of, Subject, switchMap } from 'rxjs';

import { Client, ClientAPI, PartnerType, Query } from '../../../../core';
import { TenantService } from '../../../../services';
import { AdEntityComponent } from '../../../../shared';
import { ClientDialogComponent, ClientDialogData } from '../client-dialog/client-dialog.component';

interface ClientQueryControls {
  search: FormControl<string>;
}

@Component({
  selector: 'carambola-client-manager',
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
    AdEntityComponent,
  ],
  templateUrl: './client.component.html',
  styleUrls: ['./client.component.scss'],
})
export class ClientManagerComponent implements OnInit, AfterViewInit {
  private formBuilder = inject(FormBuilder);
  private dialog = inject(MatDialog);
  private clientAPI = inject(ClientAPI);
  private tenantService = inject(TenantService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  PartnerType = PartnerType;

  displayedColumns: string[] = ['name', 'actions'];
  hoverRow: Client | null = null;

  mode: WritableSignal<PartnerType> = signal(PartnerType.PARTNER_TYPE_UNKNOWN);
  formGroupQuery: FormGroup<ClientQueryControls>;
  formQuery: Query<Client> = {
    filter: {},
    searchKey: ['name'],
    searchValue: '',
  };

  readonly sort = viewChild(MatSort);
  readonly paginator = viewChild(MatPaginator);

  dataRequest$ = new Subject<Query<Client>>();
  dataSource = new MatTableDataSource<Client>([]);

  constructor() {
    this.formGroupQuery = this.formBuilder.group({
      search: this.formBuilder.nonNullable.control(''),
    });

    effect(() => {
      const mode = this.mode();
      const tenant = this.tenantService.tenant();

      if (mode === PartnerType.PARTNER_TYPE_UNKNOWN) {
        return;
      }
      if (!tenant) {
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
      switchMap(query =>
        this.clientAPI.getClientList(query).pipe(
          catchError(() => {
            return of([]);
          })
        )
      ),
    ).subscribe(clients => {
      this.dataSource.data = clients.filter(client => !client.deleted).sort((a, b) => {
        const keya = a.updateTime ? new Date(a.updateTime) : new Date(0);
        const keyb = b.updateTime ? new Date(b.updateTime) : new Date(0);
        if (keya < keyb) {
          return 1;
        } else if (keya > keyb) {
          return -1;
        } else {
          return 0;
        }
      });
      this.dataSource.sort = this.sort() ?? null;
      this.dataSource.paginator = this.paginator() ?? null;
    });

    this.formGroupQuery.valueChanges.subscribe(() => {
      this.query();
    })
  }

  ngAfterViewInit() {
    this.route.queryParams.subscribe(params => {
      this.formGroupQuery.controls.search.setValue('');
      this.dataSource.data = [];

      if (params['directMode']) {
        this.mode.set(params['directMode'] === 'true' ? PartnerType.PARTNER_TYPE_DIRECT : PartnerType.PARTNER_TYPE_PROGRAMMATIC);
      } else {
        this.mode.set(PartnerType.PARTNER_TYPE_PROGRAMMATIC);
      }
    });
  }

  mouseenter(row: Client) {
    this.hoverRow = row;
  }

  mouseleave() {
    this.hoverRow = null;
  }

  query() {
    this.formQuery = {
      filter: {
        mode: [String(this.mode())],
      },
      searchKey: ['name', 'code'],
      searchValue: this.searchValue,
    };

    this.dataRequest$.next(this.formQuery);
  }

  clear(event: Event, field: keyof ClientQueryControls, value: string) {
    event.stopPropagation();
    this.formGroupQuery.patchValue({[field]: value});
    this.query();
  }

  canCreateMedia(): boolean {
    return this.tenantService.isTenantManager() || this.tenantService.isManager();
  }

  createMedia(row: Client, event: MouseEvent) {
    this.router.navigate(['admin', 'ad', 'clientmedia'], { queryParams: { directMode: this.mode() === PartnerType.PARTNER_TYPE_DIRECT, client: row.id, add: 'add' }});
    event.stopPropagation();
  }

  newClient() {
    const dialogRef = this.dialog.open<ClientDialogComponent, ClientDialogData>(ClientDialogComponent, {
      data: {
        mode: this.mode(),
        client: null,
      },
      minWidth: '80vw',
      minHeight: '80vh',
      maxWidth: '80vw',
      maxHeight: '80vh',
      width: '80vw',
      height: '80vh',
    });

    dialogRef.afterClosed().subscribe(changed => {
      if (changed) {
        this.query();
      }
    });
  }

  modifyClient(client: Client) {
    const dialogRef = this.dialog.open<ClientDialogComponent, ClientDialogData>(ClientDialogComponent, {
      data: {
        mode: this.mode(),
        client: client,
      },
      minWidth: '80vw',
      minHeight: '80vh',
      maxWidth: '80vw',
      maxHeight: '80vh',
    });

    dialogRef.afterClosed().subscribe(changed => {
      if (changed) {
        this.query();
      }
    });
  }

}
