import { AfterViewInit, Component, effect, OnInit, signal, ViewChild, WritableSignal, inject } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
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

import { Client, ClientAPI, ClientMedia, ClientMediaAPI, ClientPort, ClientPortAPI, PartnerType, PortType, Query } from '../../../../core';
import { AdEntityComponent, FilteredSelectClientComponent, FilteredSelectClientMediaComponent } from '../../../../shared';
import { TenantService } from '../../../../services';
import { ClientPortDialogComponent, ClientPortDialogData } from '../clientport-dialog/clientport-dialog.component';

interface ClientPortQueryControls {
  client: FormControl<Client[]>;
  clientMedia: FormControl<ClientMedia[]>;
  platform: FormControl<string[]>;
  format: FormControl<string[]>;
  budget: FormControl<string[]>;
  mode: FormControl<string[]>;
  status: FormControl<string[]>;
  search: FormControl<string>;
}

@Component({
  selector: 'carambola-clientport-manager',
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
    FilteredSelectClientMediaComponent,
  ],
  templateUrl: './clientport.component.html',
  styleUrls: ['./clientport.component.scss'],
})
export class ClientPortManagerComponent implements OnInit, AfterViewInit {
  private formBuilder = inject(FormBuilder);
  private dialog = inject(MatDialog);
  private tenantService = inject(TenantService);
  private clientAPI = inject(ClientAPI);
  private clientMediaAPI = inject(ClientMediaAPI);
  private clientPortAPI = inject(ClientPortAPI);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  PortType = PortType;

  displayedColumns: string[] = ['client', 'clientMedia', 'name', 'format', 'budget', 'connection', 'actions'];
  hoverRow: ClientPort | null = null;

  mode: WritableSignal<PartnerType> = signal(PartnerType.PARTNER_TYPE_UNKNOWN);
  formGroupQuery: FormGroup<ClientPortQueryControls>;
  filterClient: Client[] = [];
  allClientMedia: ClientMedia[] = [];
  filterClientMedia: ClientMedia[] = [];
  filterPlatform: Map<string, string>;
  filterFormat: Map<string, string>;
  filterBudget: Map<string, string>;
  filterMode: Map<string, string>;
  filterStatus: Map<string, string>;
  formQuery: Query<ClientPort> = {
    filter: {},
    searchKey: ['name', 'tagId'],
    searchValue: '',
  };

  @ViewChild(MatSort, {static: false}) sort: MatSort | null = null;
  @ViewChild(MatPaginator, {static: false}) paginator: MatPaginator | null = null;

  dataRequest$ = new Subject<Query<ClientPort>>();
  dataSource = new MatTableDataSource<ClientPort>([]);

  constructor() {
    this.formGroupQuery = this.formBuilder.group({
      client: this.formBuilder.nonNullable.control<Client[]>([]),
      clientMedia: this.formBuilder.nonNullable.control<ClientMedia[]>([]),
      platform: this.formBuilder.nonNullable.control<string[]>([]),
      format: this.formBuilder.nonNullable.control<string[]>([]),
      budget: this.formBuilder.nonNullable.control<string[]>([]),
      mode: this.formBuilder.nonNullable.control<string[]>([]),
      status: this.formBuilder.nonNullable.control<string[]>([]),
      search: this.formBuilder.nonNullable.control(''),
    });

    this.filterPlatform = new Map([
      ['iOS', 'iOS'],
      ['Android', 'Android'],
      ['Web', 'Web'],
    ]);
    this.filterFormat = new Map([
      ['banner', '横幅'],
      ['interstitial', '插屏'],
      ['splash', '开屏'],
      ['feeds', '信息流'],
      ['video', '视频'],
    ]);
    this.filterBudget = new Map([
      ['unknown', '未知'],
      ['k2', 'k2'],
      ['tanx', 'tanx'],
      ['jd', '京东'],
      ['qihang', '启航'],
      ['dahanghai', '大航海'],
      ['kuaishou', '快手'],
      ['pinduoduo', '拼多多'],
      ['huichuan', '汇川'],
      ['game', '游戏'],
      ['didi', '滴滴'],
      ['iqiyi', '爱奇艺'],
      ['baidu', '百度'],
      ['meituan', '美团'],
      ['juheshangcheng', '聚合电商'],
      ['mangguo', '芒果'],
    ]);
    this.filterMode = new Map([
      ['1', '分成模式'],
      ['2', '竞价模式'],
      ['3', '直通模式'],
    ]);
    this.filterStatus = new Map([
      ['1', '启用'],
      ['2', '未启用'],
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
          mode: [String(mode)],
        },
        searchKey: [],
        searchValue: '',
      }).subscribe(clients => {
        clients = clients.filter(client => !client.deleted);
        this.filterClient = clients;
      });
      this.clientMediaAPI.getClientMediaList({
        filter: {
          clientMode: [String(mode)],
        },
        searchKey: [],
        searchValue: '',
      }).subscribe(clientMedias => {
        clientMedias = clientMedias.filter(clientMedia => !clientMedia.deleted);
        this.allClientMedia = clientMedias;
        this.filterClientMedia = clientMedias;
      });

      this.query();
    });
  }

  get selectedClients(): Client[] {
    return this.formGroupQuery.controls.client.value;
  }

  get selectedClientMedias(): ClientMedia[] {
    return this.formGroupQuery.controls.clientMedia.value;
  }

  get selectedPlatforms(): string[] {
    return this.formGroupQuery.controls.platform.value;
  }

  get selectedFormats(): string[] {
    return this.formGroupQuery.controls.format.value;
  }

  get selectedBudgets(): string[] {
    return this.formGroupQuery.controls.budget.value;
  }

  get selectedModes(): string[] {
    return this.formGroupQuery.controls.mode.value;
  }

  get selectedStatuses(): string[] {
    return this.formGroupQuery.controls.status.value;
  }

  get searchValue(): string {
    return this.formGroupQuery.controls.search.value;
  }

  ngOnInit() {
    this.dataRequest$.pipe(
      debounceTime(500),
      switchMap(query =>
        this.clientPortAPI.getClientPortList(query).pipe(
          catchError(() => {
            return of([]);
          })
        )
      ),
    ).subscribe(clientPorts => {
      let data = clientPorts.filter(clientPort => !clientPort.deleted);
      if (this.selectedStatuses.length > 0) {
        if (this.selectedStatuses.indexOf('1') < 0) {
          data = data.filter(clientPort => {
            return clientPort.connection.filter(connection => connection.enabled).length === 0;
          });
        }
        if (this.selectedStatuses.indexOf('2') < 0) {
          data = data.filter(clientPort => {
            return clientPort.connection.filter(connection => connection.enabled).length > 0;
          });
        }
      }
      this.dataSource.data = data.sort((a, b) => {
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
      this.dataSource.sortingDataAccessor = (item, property) => {
        switch (property) {
          case 'client':
            return item.client.name;
          case 'clientMedia':
            return item.clientMedia.name;
          case 'name':
            return item.name;
          case 'format':
            return item.format;
          case 'budget':
            return item.budget;
          case 'tagId':
            return item.tagId;
          case 'mode':
            return item.mode;
          case 'connection':
            return item.connection.filter(connection => connection.enabled).length;
          default:
            return '';
        }
      }
    });

    this.formGroupQuery.valueChanges.subscribe(() => {
      this.query();
    })
  }

  ngAfterViewInit() {
    this.route.queryParams.subscribe(params => {
      this.formGroupQuery.controls.client.setValue([]);
      this.formGroupQuery.controls.clientMedia.setValue([]);
      this.formGroupQuery.controls.platform.setValue([]);
      this.formGroupQuery.controls.format.setValue([]);
      this.formGroupQuery.controls.budget.setValue([]);
      this.formGroupQuery.controls.mode.setValue([]);
      this.formGroupQuery.controls.status.setValue([]);
      this.formGroupQuery.controls.search.setValue('');
      this.dataSource.data = [];

      if (params['directMode']) {
        this.mode.set(params['directMode'] === 'true' ? PartnerType.PARTNER_TYPE_DIRECT : PartnerType.PARTNER_TYPE_PROGRAMMATIC);
      } else {
        this.mode.set(PartnerType.PARTNER_TYPE_PROGRAMMATIC);
      }

      if (this.mode() === PartnerType.PARTNER_TYPE_DIRECT) {
        if (this.selectedModes.indexOf(String(PartnerType.PARTNER_TYPE_DIRECT)) < 0) {
          this.formGroupQuery.controls.mode.setValue([]);
        }
        this.filterMode = new Map([
          ['3', '直通模式'],
        ]);
      }
      if (this.mode() === PartnerType.PARTNER_TYPE_PROGRAMMATIC) {
        if (this.selectedModes.indexOf(String(PartnerType.PARTNER_TYPE_DIRECT)) >= 0) {
          this.formGroupQuery.controls.mode.setValue([]);
        }
        this.filterMode = new Map([
          ['1', '分成模式'],
          ['2', '竞价模式'],
        ]);
      }

      const clientMediaId = params['clientmedia'];
      const add = params['add'];

      if (add) {
        this.newClientPort(+clientMediaId);
      }

      const portId = params['port'];
      const property = params['property'];
      const connection = params['connection'];

      if (portId) {
        this.clientPortAPI.getClientPort(portId).subscribe(clientPort => {
          if (property) {
            this.modifyClientPort(clientPort, 'property');
          }
          if (connection) {
            this.modifyClientPort(clientPort, 'connection');
          }
        });
      }
    });
  }

  mouseenter(row: ClientPort) {
    this.hoverRow = row;
  }

  mouseleave() {
    this.hoverRow = null;
  }

  query() {
    if (this.selectedPlatforms.length > 0) {
      this.filterClientMedia = this.allClientMedia.filter(clientMedia => this.selectedPlatforms.indexOf(clientMedia.platform) >= 0);
    } else {
      this.filterClientMedia = this.allClientMedia;
    }

    this.formQuery = {
      filter: {
        clientMode: [String(this.mode())],
        client: this.selectedClients.map(client => client.id!.toString()),
        clientMedia: this.selectedClientMedias.map(clientMedia => clientMedia.id!.toString()),
        platform: this.selectedPlatforms,
        format: this.selectedFormats,
        budget: this.selectedBudgets,
        mode: this.selectedModes,
      },
      searchKey: ['name', 'tagId'],
      searchValue: this.searchValue,
    };

    this.dataRequest$.next(this.formQuery);
  }

  clear(
    event: Event,
    field: keyof ClientPortQueryControls,
    value: string | Client[] | ClientMedia[] | string[]
  ) {
    event.stopPropagation();
    this.formGroupQuery.patchValue({[field]: value});
    this.query();
  }

  canViewConnection(): boolean {
    return this.tenantService.isTenantManager() || this.tenantService.isTenantOperator() || this.tenantService.isTenantObserver() || this.tenantService.isManager();
  }

  newClientPort(clientMediaId: number) {
    const dialogRef = this.dialog.open<ClientPortDialogComponent, ClientPortDialogData>(ClientPortDialogComponent, {
      data: {
        mode: this.mode(),
        tab: 'property',
        clientMediaId: clientMediaId,
        clientPort: null,
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
        queryParams: { 'add': null, 'clientmedia': null },
        queryParamsHandling: 'merge'
      });

      if (changed) {
        this.query();
      }
    });
  }

  modifyClientPort(clientPort: ClientPort, tab: string) {
    const dialogRef = this.dialog.open<ClientPortDialogComponent, ClientPortDialogData>(ClientPortDialogComponent, {
      data: {
        mode: this.mode(),
        tab: tab,
        clientMediaId: 0,
        clientPort: clientPort,
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

  getConnectionStatus(clientPort: ClientPort) {
    return clientPort.connection.filter(connection => connection.enabled).length > 0;
  }

}
