import { AfterViewInit, ChangeDetectionStrategy, Component, DestroyRef, effect, inject, OnInit, signal, viewChild, WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, debounceTime, of, Subject, switchMap } from 'rxjs';

import { Client, ClientAPI, ClientMedia, ClientMediaAPI, PartnerType, Query } from '../../../../core';
import { TenantService } from '../../../../services';
import { AdEntityComponent, FilteredSelectClientComponent } from '../../../../shared';
import { ClientMediaDialogComponent, ClientMediaDialogData } from '../clientmedia-dialog/clientmedia-dialog.component';

interface ClientMediaQueryControls {
  client: FormControl<Client[]>;
  platform: FormControl<string[]>;
  search: FormControl<string>;
}

@Component({
  selector: 'carambola-clientmedia-manager',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginator,
    MatPaginatorModule,
    MatSelectModule,
    MatSort,
    MatSortModule,
    MatTableModule,
    AdEntityComponent,
    FilteredSelectClientComponent,
  ],
  templateUrl: './clientmedia.component.html',
  styleUrls: ['./clientmedia.component.scss'],
})
export class ClientMediaManagerComponent implements OnInit, AfterViewInit {
  private destroyRef = inject(DestroyRef);
  private formBuilder = inject(FormBuilder);
  private dialog = inject(MatDialog);
  private tenantService = inject(TenantService);
  private clientAPI = inject(ClientAPI);
  private clientMediaAPI = inject(ClientMediaAPI);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  displayedColumns: string[] = ['client', 'name', 'appversion', 'applink', 'actions'];
  hoverRow: ClientMedia | null = null;

  mode: WritableSignal<PartnerType> = signal(PartnerType.PARTNER_TYPE_UNKNOWN);
  formGroupQuery: FormGroup<ClientMediaQueryControls>;
  filterClient = signal<Client[]>([]);
  filterPlatform: Map<string, string>;
  formQuery: Query<ClientMedia> = {
    filter: {},
    searchKey: ['name', 'apppackage'],
    searchValue: '',
  };

  readonly sort = viewChild(MatSort);
  readonly paginator = viewChild(MatPaginator);

  dataRequest$ = new Subject<Query<ClientMedia>>();
  dataSource = signal(this.createDataSource([]));

  constructor() {
    this.formGroupQuery = this.formBuilder.group({
      client: this.formBuilder.nonNullable.control<Client[]>([]),
      platform: this.formBuilder.nonNullable.control<string[]>([]),
      search: this.formBuilder.nonNullable.control(''),
    });

    this.filterPlatform = new Map([
      ['iOS', 'iOS'],
      ['Android', 'Android'],
      ['Web', 'Web'],
    ]);

    effect(() => {
      const mode = this.mode();
      const tenant = this.tenantService.tenant();

      if (mode === PartnerType.PARTNER_TYPE_UNKNOWN) {
        return;
      }
      if (!tenant) {
        return;
      }

      this.clientAPI.getClientList({
        filter: {
          mode: [String(this.mode())],
        },
        searchKey: [],
        searchValue: '',
      }).subscribe(clients => {
        clients = clients.filter(client => !client.deleted);
        this.filterClient.set(clients);
      });

      this.query();
    });
  }

  get selectedClients(): Client[] {
    return this.formGroupQuery.controls.client.value;
  }

  get selectedPlatforms(): string[] {
    return this.formGroupQuery.controls.platform.value;
  }

  get searchValue(): string {
    return this.formGroupQuery.controls.search.value;
  }

  ngOnInit() {
    this.dataRequest$.pipe(
      debounceTime(500),
      switchMap(query =>
        this.clientMediaAPI.getClientMediaList(query).pipe(
          catchError(() => {
            return of([]);
          })
        )
      ),
    ).subscribe(clientMedias => {
      const data = clientMedias.filter(clientMedia => !clientMedia.deleted).sort((a, b) => {
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

      this.dataSource.set(this.createDataSource(data));
    });
  }

  ngAfterViewInit() {
    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      this.formGroupQuery.controls.client.setValue([]);
      this.formGroupQuery.controls.platform.setValue([]);
      this.formGroupQuery.controls.search.setValue('');
      this.dataSource.set(this.createDataSource([]));

      if (params['directMode']) {
        this.mode.set(params['directMode'] === 'true' ? PartnerType.PARTNER_TYPE_DIRECT : PartnerType.PARTNER_TYPE_PROGRAMMATIC);
      } else {
        this.mode.set(PartnerType.PARTNER_TYPE_PROGRAMMATIC);
      }

      const clientId = params['client'];
      const add = params['add'];

      if (add) {
        this.newClientMedia(+clientId);
      }
    });

    this.formGroupQuery.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.query();
    })
  }

  mouseenter(row: ClientMedia) {
    this.hoverRow = row;
  }

  mouseleave() {
    this.hoverRow = null;
  }

  private createDataSource(data: ClientMedia[]): MatTableDataSource<ClientMedia> {
    const dataSource = new MatTableDataSource(data);
    dataSource.sort = this.sort() ?? null;
    dataSource.paginator = this.paginator() ?? null;
    return dataSource;
  }

  query() {
    this.formQuery = {
      filter: {
        clientMode: [String(this.mode())],
        client: this.selectedClients.map(client => client.id!.toString()),
        platform: this.selectedPlatforms,
      },
      searchKey: ['name', 'apppackage'],
      searchValue: this.searchValue,
    };

    this.dataRequest$.next(this.formQuery);
  }

  clear(
    event: Event,
    field: keyof ClientMediaQueryControls,
    value: string | Client[] | string[]
  ) {
    event.stopPropagation();
    this.formGroupQuery.patchValue({[field]: value});
    this.query();
  }

  canCreatePort(): boolean {
    return this.tenantService.isTenantManager() || this.tenantService.isManager();
  }

  createPort(row: ClientMedia, event: MouseEvent) {
    this.router.navigate(['admin', 'ad', 'clientport'], { queryParams: { directMode: this.mode() === PartnerType.PARTNER_TYPE_DIRECT, clientmedia: row.id, add: 'add' }});
    event.stopPropagation();
  }

  newClientMedia(clientId: number) {
    const dialogRef = this.dialog.open<ClientMediaDialogComponent, ClientMediaDialogData>(ClientMediaDialogComponent, {
      data: {
        mode: this.mode(),
        clientId: clientId,
        clientMedia: null,
      },
      minWidth: '80vw',
      minHeight: '80vh',
      maxWidth: '80vw',
      maxHeight: '80vh',
      width: '80vw',
      height: '80vh',
    });

    dialogRef.afterClosed().subscribe(changed => {
      this.router.navigate([], {
        queryParams: { 'add': null, 'client': null },
        queryParamsHandling: 'merge'
      });

      if (changed) {
        this.query();
      }
    });
  }

  modifyClientMedia(clientMedia: ClientMedia) {
    const dialogRef = this.dialog.open<ClientMediaDialogComponent, ClientMediaDialogData>(ClientMediaDialogComponent, {
      data: {
        mode: this.mode(),
        clientId: 0,
        clientMedia: clientMedia,
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
