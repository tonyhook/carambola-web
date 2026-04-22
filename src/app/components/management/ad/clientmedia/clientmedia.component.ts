import { AfterViewInit, Component, effect, OnInit, signal, ViewChild, WritableSignal, inject } from '@angular/core';
import { UntypedFormGroup, UntypedFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { catchError, debounceTime, of, Subject, switchMap } from 'rxjs';

import { Client, ClientAPI, ClientMedia, ClientMediaAPI, PartnerType, Query } from '../../../../core';
import { AdEntityComponent, FilteredSelectClientComponent } from '../../../../shared';
import { TenantService } from '../../../../services';
import { ClientMediaDialogComponent, ClientMediaDialogData } from '../clientmedia-dialog/clientmedia-dialog.component';

@Component({
  selector: 'carambola-clientmedia-manager',
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
  private formBuilder = inject(UntypedFormBuilder);
  private dialog = inject(MatDialog);
  private tenantService = inject(TenantService);
  private clientAPI = inject(ClientAPI);
  private clientMediaAPI = inject(ClientMediaAPI);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  displayedColumns: string[] = ['client', 'name', 'appversion', 'applink', 'actions'];
  hoverRow: ClientMedia | null = null;

  mode: WritableSignal<PartnerType> = signal(PartnerType.PARTNER_TYPE_UNKNOWN);
  formGroupQuery: UntypedFormGroup;
  filterClient: Client[] = [];
  filterPlatform: Map<string, string>;
  formQuery: Query<ClientMedia> = {
    filter: {},
    searchKey: ['name', 'apppackage'],
    searchValue: '',
  };

  @ViewChild(MatSort, {static: false}) sort: MatSort | null = null;
  @ViewChild(MatPaginator, {static: false}) paginator: MatPaginator | null = null;

  dataRequest$ = new Subject<Query<ClientMedia>>();
  dataSource = new MatTableDataSource<ClientMedia>([]);

  constructor() {
    this.formGroupQuery = this.formBuilder.group({
      'client': [[], null],
      'platform': [[], null],
      'search': ['', null],
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
        this.filterClient = clients;
      });

      this.query();
    });
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
      this.dataSource.data = clientMedias.filter(clientMedia => !clientMedia.deleted).sort((a, b) => {
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
      this.dataSource.sort = this.sort;
      this.dataSource.paginator = this.paginator;
    });
  }

  ngAfterViewInit() {
    this.route.queryParams.subscribe(params => {
      this.formGroupQuery.controls['client'].setValue([]);
      this.formGroupQuery.controls['platform'].setValue([]);
      this.formGroupQuery.controls['search'].setValue('');
      this.dataSource.data = [];

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

    this.formGroupQuery.valueChanges.subscribe(() => {
      this.query();
    })
  }

  mouseenter(row: ClientMedia) {
    this.hoverRow = row;
  }

  mouseleave() {
    this.hoverRow = null;
  }

  query() {
    this.formQuery = {
      filter: {
        clientMode: [String(this.mode())],
        client: (this.formGroupQuery.value.client as Client[]).map(client => client.id!.toString()),
        platform: this.formGroupQuery.value.platform,
      },
      searchKey: ['name', 'apppackage'],
      searchValue: this.formGroupQuery.value.search,
    };

    this.dataRequest$.next(this.formQuery);
  }

  clear(event: Event, field: string, value: string | unknown[]) {
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
