import { AfterViewInit, Component, computed, effect, ElementRef, inject, input, output, signal, WritableSignal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleChange, MatButtonToggleGroup, MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { forkJoin, startWith } from 'rxjs';
import {
  Field,
  QueryArrowIconDirective,
  QueryBuilderComponent,
  QueryBuilderConfig,
  QueryButtonGroupDirective,
  QueryEntityDirective,
  QueryFieldDirective,
  QueryInputDirective,
  QueryOperatorDirective,
  QueryRemoveButtonDirective,
  QuerySwitchGroupDirective,
  RuleSet,
} from '@solidexpert/ngx-query-builder';

import { AntiFraud, AntiFraudAPI, AntiFraudPeriod, Client, ClientAPI, ClientMedia, ClientMediaAPI, ClientPort, ClientPortAPI, Connection, PartnerType, PortType, TrafficControl, TrafficControlAPI, TrafficControlIndicator, TrafficControlPeriod } from '../../../../core';
import { TenantService } from '../../../../services';
import { AntiFraudComponent, AntiFraudDialogComponent, buildPortNameTemplate, ChartPostlinkComponent, ConfirmDialogComponent, ConnectionComponent, FilteredSelectClientComponent, FilteredSelectClientMediaComponent, TrafficControlComponent, TrafficControlDialogComponent } from '../../../../shared';
import { ChartTrafficComponent } from "../../../../shared/components/chart-traffic/chart-traffic.component";
import { ChartFinanceComponent } from '../../../../shared/components/chart-finance/chart-finance.component';

type ClientPortQueryType = 'simple' | 'advanced' | 'predefined1' | 'predefined2' | 'predefined3' | 'predefined4';

interface ClientPortFormControls {
  client: FormControl<Client | null>;
  clientMedia: FormControl<ClientMedia | null>;
  name: FormControl<string>;
  format: FormControl<string>;
  budget: FormControl<string>;
  mode: FormControl<number>;
  appname: FormControl<string | null>;
  apppackage: FormControl<string | null>;
  filter: FormControl<boolean>;
  remark: FormControl<string | null>;
}

@Component({
  selector: 'carambola-clientport-form',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatCheckboxModule,
    MatChipsModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatRadioModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTabsModule,
    QueryBuilderComponent,
    QueryArrowIconDirective,
    QueryButtonGroupDirective,
    QueryEntityDirective,
    QueryFieldDirective,
    QueryInputDirective,
    QueryOperatorDirective,
    QueryRemoveButtonDirective,
    QuerySwitchGroupDirective,
    ConnectionComponent,
    FilteredSelectClientComponent,
    FilteredSelectClientMediaComponent,
    TrafficControlComponent,
    AntiFraudComponent,
    ChartPostlinkComponent,
    ChartTrafficComponent,
    ChartFinanceComponent,
  ],
  templateUrl: './clientport-form.component.html',
  styleUrls: ['./clientport-form.component.scss'],
})
export class ClientPortFormComponent implements AfterViewInit {
  private formBuilder = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private tenantService = inject(TenantService);
  private clientAPI = inject(ClientAPI);
  private clientMediaAPI = inject(ClientMediaAPI);
  private clientPortAPI = inject(ClientPortAPI);
  private trafficControlAPI = inject(TrafficControlAPI);
  private antiFraudAPI = inject(AntiFraudAPI);
  private dialog = inject(MatDialog);

  PartnerType = PartnerType;
  PortType = PortType;

  ctrlFilter = new FormControl<[string, Field] | string | null>(null);
  readonly filterField = toSignal(this.ctrlFilter.valueChanges.pipe(startWith(null)), {initialValue: null});
  readonly filteredFields = computed(() => {
    const field = this.filterField();

    if (!field) {
      return this.simpleFields.slice();
    }

    if (typeof field === 'string') {
      return this._filter(field);
    }

    return this._filter(field[0]);
  });
  selectedFilters: [string, Field][] = [];
  readonly inputFilter = viewChild<ElementRef<HTMLInputElement>>('inputFilter');
  readonly queryTypeToggleGroup = viewChild<MatButtonToggleGroup>('queryTypeToggleGroup');

  formGroup: FormGroup<ClientPortFormControls>;
  clients: WritableSignal<Client[]> = signal([]);
  managedClients: WritableSignal<Client[]> = signal([]);
  clientMedias: WritableSignal<ClientMedia[]> = signal([]);
  managedClientMedias: WritableSignal<ClientMedia[]> = signal([]);
  formClientId: WritableSignal<number> = signal(0);

  initialized = false;
  autoNameManaged = true;
  lastGeneratedName = '';
  syncingAutoName = false;

  formProtocolKey: string[] = [];

  isConnectionManager = false;
  isConnectionObserver = false;
  readonly = false;

  mode = input<PartnerType>(PartnerType.PARTNER_TYPE_DIRECT);
  tab = input<string>('property');
  clientMediaId = input<number>(0);
  clientPort = input<ClientPort | null>(null);
  changed = output<boolean>();

  clientPortFull: ClientPort | null = null;
  connections: Connection[] = [];
  trafficControls: TrafficControl[] = [];
  antiFrauds: AntiFraud[] = [];
  trackers: string[] = [];
  selectedIndex = 0;

  query: RuleSet = {
    condition: 'and',
    rules: [],
  };
  queryType: ClientPortQueryType = 'simple';

  config: QueryBuilderConfig = {
    fields: {
      'app#bundle': {name: 'app: bundle', type: 'string'},
      'app#domain': {name: 'app: domain', type: 'string'},
      'app#name': {name: 'app: name', type: 'string'},
      'app#paid': {name: 'app: paid', type: 'category', options: [ {name: '否', value: '0'}, {name: '是', value: '1'} ]},
      'app#storeid': {name: 'app: storeid', type: 'string'},
      'app#storeurl': {name: 'app: storeurl', type: 'string'},
      'app#ver': {name: 'app: ver', type: 'string'},

      'device#app': {name: 'device: app', type: 'string'},
      'device#bootmark': {name: 'device: bootmark', type: 'string'},
      'device#boottime': {name: 'device: boottime', type: 'string'},
      'device#brand': {name: 'device: brand', type: 'string'},
      'device#carrier': {name: 'device: carrier', type: 'category', options: [ {name: '中国移动', value: 'cmcc'}, {name: '中国联通', value: 'unicom'}, {name: '中国电信', value: 'telecom'}, {name: '中国广电', value: 'cbn'} ]},
      'device#contype': {name: 'device: contype', type: 'category', options: [ {name: 'Ethernet; Wired Connection', value: '1'}, {name: 'WIFI', value: '2'}, {name: 'Cellular Network - Unknown Generation', value: '3'}, {name: 'Cellular Network - 2G', value: '4'}, {name: 'Cellular Network - 3G', value: '5'}, {name: 'Cellular Network - 4G', value: '6'}, {name: 'Cellular Network - 5G', value: '7'} ]},
      'device#country': {name: 'device: country', type: 'string'},
      'device#h': {name: 'device: h', type: 'number'},
      'device#hmsv': {name: 'device: hmsv', type: 'string'},
      'device#hwmachine': {name: 'device: hwmachine', type: 'string'},
      'device#hwmodel': {name: 'device: hwmodel', type: 'string'},
      'device#hwname': {name: 'device: hwname', type: 'string'},
      'device#hwv': {name: 'device: hwv', type: 'string'},
      'device#inittime': {name: 'device: inittime', type: 'string'},
      'device#ip': {name: 'device: ip', type: 'string'},
      'device#ipv6': {name: 'device: ipv6', type: 'string'},
      'device#lang': {name: 'device: lang', type: 'string'},
      'device#lmt': {name: 'device: lmt', type: 'category', options: [ {name: '未知', value: '0'}, {name: '受限', value: '1'}, {name: '拒绝', value: '2'}, {name: '授权', value: '3'} ]},
      'device#make': {name: 'device: make', type: 'string'},
      'device#mntid': {name: 'device: mntid', type: 'string'},
      'device#model': {name: 'device: model', type: 'string'},
      'device#orientation': {name: 'device: orientation', type: 'category', options: [ {name: '竖', value: '501'}, {name: '横', value: '502'}, {name: '未知', value: '503'} ]},
      'device#os': {name: 'device: os', type: 'category', options: [ {name: '其它', value: '0'}, {name: '3DS System Software', value: '1'}, {name: 'Android', value: '2'}, {name: 'Apple TV Software', value: '3'}, {name: 'Asha', value: '4'}, {name: 'Bada', value: '5'}, {name: 'BlackBerry', value: '6'}, {name: 'BREW', value: '7'}, {name: 'ChromeOS', value: '8'}, {name: 'Darwin', value: '9'}, {name: 'FireOS', value: '10'}, {name: 'FirefoxOS', value: '11'}, {name: 'HelenOS', value: '12'}, {name: 'iOS', value: '13'}, {name: 'Linux', value: '14'}, {name: 'MacOS', value: '15'}, {name: 'MeeGo', value: '16'}, {name: 'MorphOS', value: '17'}, {name: 'NetBSD', value: '18'}, {name: 'NucleusPLUS', value: '19'}, {name: 'PS Vita System Software', value: '20'}, {name: 'PS3 System Software', value: '21'}, {name: 'PS4 Software', value: '22'}, {name: 'PSP System Software', value: '23'}, {name: 'Symbian', value: '24'}, {name: 'Tizen', value: '25'}, {name: 'WatchOS', value: '26'}, {name: 'WebOS', value: '27'}, {name: 'Windows', value: '28'}, {name: 'HarmonyOS鸿蒙', value: '501'} ]},
      'device#oslevel': {name: 'device: oslevel', type: 'number'},
      'device#osv': {name: 'device: osv', type: 'string'},
      'device#ppi': {name: 'device: ppi', type: 'number'},
      'device#pxratio': {name: 'device: pxratio', type: 'number'},
      'device#romtime': {name: 'device: romtime', type: 'string'},
      'device#romv': {name: 'device: romv', type: 'string'},
      'device#size': {name: 'device: size', type: 'number'},
      'device#skan': {name: 'device: skan', type: 'string'},
      'device#storename': {name: 'device: storename', type: 'string'},
      'device#storev': {name: 'device: storev', type: 'string'},
      'device#sysbatterypower': {name: 'device: sysbatterypower', type: 'number'},
      'device#sysbatterystatus': {name: 'device: sysbatterystatus', type: 'category', options: [ {name: '未知', value: '0'}, {name: '不在充电', value: '1'}, {name: '正在充电', value: '2'}, {name: '充满', value: '3'} ]},
      'device#syscpu': {name: 'device: syscpu', type: 'number'},
      'device#syscpufreq': {name: 'device: syscpufreq', type: 'number'},
      'device#sysdisksize': {name: 'device: sysdisksize', type: 'number'},
      'device#sysmemory': {name: 'device: sysmemory', type: 'number'},
      'device#timezone': {name: 'device: timezone', type: 'string'},
      'device#type': {name: 'device: type', type: 'category', options: [ {name: 'Mobile/Tablet - General（移动设备）', value: '1'}, {name: 'Personal Computer（电脑）', value: '2'}, {name: 'Connected TV（互联网电视）', value: '3'}, {name: 'Phone', value: '4'}, {name: 'Tablet', value: '5'}, {name: 'Connected Device', value: '6'}, {name: 'Set Top Box', value: '7'}, {name: 'OOH Device', value: '8'} ]},
      'device#ua': {name: 'device: ua', type: 'string'},
      'device#uiv': {name: 'device: uiv', type: 'string'},
      'device#updatemark': {name: 'device: updatemark', type: 'string'},
      'device#updatetime': {name: 'device: updatetime', type: 'string'},
      'device#w': {name: 'device: w', type: 'number'},
      'device#xff': {name: 'device: xff', type: 'string'},

      'id#501': {name: 'ID类型: imei', type: 'string'},
      'id#502': {name: 'ID类型: imei md5', type: 'string'},
      'id#503': {name: 'ID类型: imsi', type: 'string'},
      'id#504': {name: 'ID类型: imsi md5', type: 'string'},
      'id#505': {name: 'ID类型: oaid', type: 'string'},
      'id#506': {name: 'ID类型: oaid md5', type: 'string'},
      'id#507': {name: 'ID类型: idfa', type: 'string'},
      'id#508': {name: 'ID类型: idfa md5', type: 'string'},
      'id#509': {name: 'ID类型: androidid', type: 'string'},
      'id#510': {name: 'ID类型: androidid md5', type: 'string'},
      'id#511': {name: 'ID类型: mac', type: 'string'},
      'id#512': {name: 'ID类型: mac md5', type: 'string'},
      'id#513': {name: 'ID类型: caid（iOS 14+，广协）', type: 'string'},
      'id#514': {name: 'ID类型: aaid（iOS 14+，阿里）', type: 'string'},
      'id#515': {name: 'ID类型: idfv（iOS）', type: 'string'},
      'id#516': {name: 'ID类型: idfv md5（iOS）', type: 'string'},
      'id#517': {name: 'ID类型: phone number', type: 'string'},
      'id#518': {name: 'ID类型: phone number md5', type: 'string'},
      'id#519': {name: 'ID类型: paid（拼多多）', type: 'string'},
      'id#520': {name: 'ID类型: meid', type: 'string'},
      'id#521': {name: 'ID类型: meid md5', type: 'string'},
      'id#522': {name: 'ID类型: Wi-Fi mac（OTT）', type: 'string'},
      'id#523': {name: 'ID类型: Wi-Fi mac md5（OTT）', type: 'string'},
      'id#524': {name: 'ID类型: Wi-Fi SSID', type: 'string'},
      'id#525': {name: 'ID类型: LAN mac（OTT）', type: 'string'},
      'id#526': {name: 'ID类型: LAN mac md5（OTT）', type: 'string'},
      'id#527': {name: 'ID类型: device name', type: 'string'},
      'id#528': {name: 'ID类型: device name md5', type: 'string'},
    },
    getOperators: (fieldName: string, field: Field) => {
      if (field.type === 'string') {
        return ['is not null', '=', '!=', 'contains', 'like'];
      }
      if (field.type === 'category') {
        return ['is not null', '=', '!=', 'in', 'not in'];
      }
      if (field.type === 'number') {
        return ['is not null', '=', '!=', '>', '>=', '<', '<='];
      }
      if (field.type === 'boolean') {
        return ['is not null', '='];
      }
      return ['is not null'];
    }
  }
  simpleFields = Object.entries(this.config.fields);

  getOperator(operator: string): string {
    switch (operator) {
      case '=':
        return '等于';
      case '!=':
        return '不等于';
      case '>':
        return '大于';
      case '>=':
        return '大于等于';
      case '<':
        return '小于';
      case '<=':
        return '小于等于';
      case 'in':
        return '是其中某一个';
      case 'not in':
        return '不是其中任何一个';
      case 'contains':
        return '包含';
      case 'like':
        return '类似';
      case 'is not null':
        return '存在';
      default:
        return operator;
    }
  }

  constructor() {
    this.formGroup = this.formBuilder.group({
      client: this.formBuilder.control<Client | null>(null, Validators.required),
      clientMedia: this.formBuilder.control<ClientMedia | null>(null, Validators.required),
      name: this.formBuilder.nonNullable.control('', Validators.required),
      format: this.formBuilder.nonNullable.control('banner', Validators.required),
      budget: this.formBuilder.nonNullable.control('unknown', Validators.required),
      mode: this.formBuilder.nonNullable.control(PortType.PORT_TYPE_SHARE, Validators.required),
      appname: this.formBuilder.control<string | null>(''),
      apppackage: this.formBuilder.control<string | null>(''),
      filter: this.formBuilder.nonNullable.control(false),
      remark: this.formBuilder.control<string | null>(''),
    });

    effect(() => {
      const clientPort = this.clientPort();
      const clientMediaId = this.clientMediaId();
      const clients = this.clients();
      const clientMedias = this.clientMedias();
      const tab = this.tab();

      if (!this.initialized) {
        if (!clientPort) {
          if (clientMediaId > 0) {
            const clientMedia = clientMedias.find(clientMedia => clientMedia.id === clientMediaId) ?? null;
            if (clientMedia) {
              const client = clients.find(client => client.id === clientMedia.client.id) ?? null;
              if (client) {
                this.initialized = true;

                this.formClientId.set(client.id!);
                this.managedClientMedias.set(clientMedias.filter(clientMedia => clientMedia.client.id === client.id));
                this.connections = [];
                this.trafficControls = [];
                this.antiFrauds = [];

                this.formGroup.setControl('client', this.createClientControl(client), {emitEvent: false});
                this.formGroup.setControl('clientMedia', this.createClientMediaControl(clientMedia), {emitEvent: false});

                this.query = {
                  condition: 'and',
                  rules: [],
                };
                this.queryType = 'simple';

                if (this.mode() === PartnerType.PARTNER_TYPE_DIRECT) {
                  this.formProtocolKey = ['id'];
                  this.setProtocolControl('id', '');
                  this.formGroup.setControl('mode', this.createModeControl(PortType.PORT_TYPE_DIRECT, true), {emitEvent: false});
                }
                if (this.mode() === PartnerType.PARTNER_TYPE_PROGRAMMATIC) {
                  this.formProtocolKey = client.protocolKey;
                  for (const key of client.protocolKey) {
                    this.setProtocolControl(key, '');
                  }
                  this.formGroup.setControl('mode', this.createModeControl(PortType.PORT_TYPE_SHARE, false), {emitEvent: false});
                }

                this.initializeAutoName(null);
              }
            }
          } else {
            this.initialized = true;

            this.connections = [];
            this.trafficControls = [];
            this.antiFrauds = [];

            this.formGroup.setControl('client', this.createClientControl(null, false), {emitEvent: false});
            this.formGroup.setControl('clientMedia', this.createClientMediaControl(null, true), {emitEvent: false});

            this.query = {
              condition: 'and',
              rules: [],
            };
            this.queryType = 'simple';

            if (this.mode() === PartnerType.PARTNER_TYPE_DIRECT) {
              this.formProtocolKey = ['id'];
              this.setProtocolControl('id', '');
              this.formGroup.setControl('mode', this.createModeControl(PortType.PORT_TYPE_DIRECT, true), {emitEvent: false});
            }
            if (this.mode() === PartnerType.PARTNER_TYPE_PROGRAMMATIC) {
              this.formGroup.setControl('mode', this.createModeControl(PortType.PORT_TYPE_SHARE, false), {emitEvent: false});
            }

            this.initializeAutoName(null);
          }
        } else {
          forkJoin([
            this.clientPortAPI.getClientPort(clientPort.id!),
            this.trafficControlAPI.getTrafficControlListByPort(clientPort.id!, -1),
            this.antiFraudAPI.getAntiFraudListByPort(clientPort.id!),
            this.clientPortAPI.getClientPortTrackerList(clientPort.id!),
          ]).subscribe(results => {
            const clientPort = results[0];
            const trafficControls = results[1];
            const antifrauds = results[2];
            const trackers = results[3];

            this.clientPortFull = clientPort;
            this.trackers = trackers;

            this.readonly = !this.tenantService.isTenantManager() && !this.tenantService.isManager();
            this.isConnectionManager = this.tenantService.isTenantManager() || this.tenantService.isTenantOperator() || this.tenantService.isManager();
            this.isConnectionObserver = this.tenantService.isTenantManager() || this.tenantService.isTenantOperator() || this.tenantService.isTenantObserver() || this.tenantService.isManager();

            const client = clients.find(client => client.id === clientPort.client.id) ?? null;
            const clientMedia = clientMedias.find(clientMedia => clientMedia.id === clientPort.clientMedia.id) ?? null;
            if (client && clientMedia) {
              this.initialized = true;

              this.formClientId.set(client.id!);
              this.managedClientMedias.set(clientMedias.filter(clientMedia => clientMedia.client.id === client.id));
              this.connections = clientPort.connection.filter(connection => !connection.deleted).filter(connection => !connection.vendorPort.deleted);
              this.trafficControls = trafficControls;
              this.antiFrauds = antifrauds;
              this.selectedIndex = tab === 'property' ? 0 : tab === 'connection' ? 1 : tab === 'deeplink' ? 2 : tab === 'tracker' ? 3 : tab === 'traffic' ? 4 : 5;

              this.formGroup.setControl('client', this.createClientControl(client), {emitEvent: false});
              this.formGroup.setControl('clientMedia', this.createClientMediaControl(clientMedia), {emitEvent: false});
              this.formGroup.setControl('name', this.createRequiredTextControl(clientPort.name), {emitEvent: false});
              this.formGroup.setControl('format', this.createRequiredTextControl(clientPort.format), {emitEvent: false});
              this.formGroup.setControl('budget', this.createRequiredTextControl(clientPort.budget), {emitEvent: false});
              this.formGroup.setControl('mode', this.createModeControl(clientPort.mode), {emitEvent: false});
              this.formGroup.setControl('appname', this.createOptionalTextControl(clientPort.appname), {emitEvent: false});
              this.formGroup.setControl('apppackage', this.createOptionalTextControl(clientPort.apppackage), {emitEvent: false});
              this.formGroup.setControl('filter', this.createFilterControl(clientPort.filter !== null && clientPort.filter.length > 0), {emitEvent: false});
              this.formGroup.setControl('remark', this.createOptionalTextControl(clientPort.remark), {emitEvent: false});

              if (clientPort.filter !== null && clientPort.filter.length > 0 && clientPort.filterType !== null && clientPort.filterType.length > 0 ) {
                this.query = JSON.parse(clientPort.filter);
                this.queryType = clientPort.filterType as ClientPortQueryType;

                if (this.queryType === 'simple' || this.queryType.startsWith('predefined')) {
                  this.selectedFilters = this.query.rules.map(rule => {
                    const field = rule.field;
                    return this.simpleFields[this.simpleFields.map(field => field[0]).indexOf(field)];
                  });
                }
              } else {
                this.query = {
                  condition: 'and',
                  rules: [],
                };
                this.queryType = 'simple';
              }

              if (this.mode() === PartnerType.PARTNER_TYPE_DIRECT) {
                this.formProtocolKey = ['id'];
                this.setProtocolControl('id', clientPort.tagId);
                this.formGroup.setControl('mode', this.createModeControl(PortType.PORT_TYPE_DIRECT, true), {emitEvent: false});
              }
              if (this.mode() === PartnerType.PARTNER_TYPE_PROGRAMMATIC) {
                this.formProtocolKey = client.protocolKey;
                for (const [index, key] of this.formProtocolKey.entries()) {
                  this.setProtocolControl(key, clientPort.tagId.split('|')[index] ?? '');
                }
                this.formGroup.setControl('mode', this.createModeControl(clientPort.mode), {emitEvent: false});
              }

              this.initializeAutoName(clientPort.name);
            }
          });
        }
      }
    });

    effect(() => {
      const tenant = this.tenantService.tenant();

      if (!tenant) {
        return;
      }

      this.clientAPI.getClientList({
        filter: {
          mode: [String(this.mode())],
        },
        searchKey: [],
        searchValue: '',
      }).subscribe(data => {
        this.clients.set(data.filter(client => !client.deleted));
        this.managedClients.set(this.clients());
      });
      this.clientMediaAPI.getClientMediaList({
        filter: {
          clientMode: [String(this.mode())],
        },
        searchKey: [],
        searchValue: '',
      }).subscribe(data => {
        this.clientMedias.set(data.filter(clientMedia => !clientMedia.deleted));
      });
    });
  }

  ngAfterViewInit() {
    this.formGroup.valueChanges.subscribe(data => {
      const client = data.client;

      if (client && client.id !== null && client.id !== this.formClientId()) {
        this.formClientId.set(client.id);
        this.formGroup.setControl('clientMedia', this.createClientMediaControl(null, false), {emitEvent: false});

        for (const key of this.formProtocolKey) {
          this.removeProtocolControl(key);
        }

        if (this.mode() === PartnerType.PARTNER_TYPE_DIRECT) {
          this.formProtocolKey = ['id'];
          this.setProtocolControl('id', '');
          this.formGroup.setControl('mode', this.createModeControl(PortType.PORT_TYPE_DIRECT, true), {emitEvent: false});
        }
        if (this.mode() === PartnerType.PARTNER_TYPE_PROGRAMMATIC) {
          this.formProtocolKey = client.protocolKey;
          for (const key of client.protocolKey) {
            this.setProtocolControl(key, '');
          }
          this.formGroup.setControl('mode', this.createModeControl(PortType.PORT_TYPE_SHARE, false), {emitEvent: false});
        }

        if (this.tenantService.isTenantManager() || this.tenantService.isManager()) {
          this.managedClientMedias.set(this.clientMedias().filter(clientMedia => clientMedia.client.id === client.id));
        }

        this.syncAutoName();
      }

      this.syncAutoName();
    });

    this.formGroup.controls.name.valueChanges.subscribe(name => {
      if (this.syncingAutoName || !this.autoNameManaged) {
        return;
      }

      if ((name ?? '') !== this.lastGeneratedName) {
        this.autoNameManaged = false;
      }
    });
  }

  private createClientControl(value: Client | null, disabled = this.readonly): FormControl<Client | null> {
    return this.formBuilder.control({value, disabled}, Validators.required);
  }

  private createClientMediaControl(value: ClientMedia | null, disabled = this.readonly): FormControl<ClientMedia | null> {
    return this.formBuilder.control({value, disabled}, Validators.required);
  }

  private createRequiredTextControl(value: string, disabled = this.readonly): FormControl<string> {
    return this.formBuilder.nonNullable.control({value, disabled}, Validators.required);
  }

  private createOptionalTextControl(value: string | null, disabled = this.readonly): FormControl<string | null> {
    return this.formBuilder.control({value, disabled});
  }

  private createFilterControl(value: boolean, disabled = this.readonly): FormControl<boolean> {
    return this.formBuilder.nonNullable.control({value, disabled});
  }

  private createModeControl(value: number, disabled = this.readonly): FormControl<number> {
    return this.formBuilder.nonNullable.control({value, disabled}, Validators.required);
  }

  private setProtocolControl(key: string, value: string) {
    (this.formGroup as unknown as FormGroup<Record<string, AbstractControl>>).setControl(key, this.formBuilder.nonNullable.control({value, disabled: this.readonly}, Validators.required), {
      emitEvent: false,
    });
  }

  private removeProtocolControl(key: string) {
    (this.formGroup as unknown as FormGroup<Record<string, AbstractControl>>).removeControl(key, {
      emitEvent: false,
    });
  }

  private getProtocolControlValue(key: string): string {
    return this.formGroup.get(key)?.getRawValue() ?? '';
  }

  private _filter(value: string): [string, Field][] {
    const filterValue = value.toLowerCase();

    return this.simpleFields.filter(field => field[1].name.toLowerCase().includes(filterValue));
  }

  private buildAutoName(): string {
    const clientMedia = this.formGroup.controls.clientMedia.value;

    return buildPortNameTemplate({
      mediaName: clientMedia?.name,
      platform: clientMedia?.platform,
      format: this.formGroup.controls.format.value,
      budget: this.formGroup.controls.budget.value,
      mode: this.formGroup.controls.mode.getRawValue(),
    });
  }

  private setNameWithoutTracking(name: string) {
    this.syncingAutoName = true;
    this.formGroup.controls.name.setValue(name, {emitEvent: false});
    this.formGroup.controls.name.markAsPristine();
    this.syncingAutoName = false;
  }

  private initializeAutoName(savedName: string | null) {
    this.lastGeneratedName = this.buildAutoName();
    this.autoNameManaged = !savedName || savedName === this.lastGeneratedName;

    if (this.autoNameManaged) {
      this.setNameWithoutTracking(this.lastGeneratedName);
    }
  }

  private syncAutoName() {
    this.lastGeneratedName = this.buildAutoName();
    if (this.autoNameManaged) {
      this.setNameWithoutTracking(this.lastGeneratedName);
    }
  }

  remove(field: [string, Field], control: FormControl<[string, Field] | string | null> | null, fields: [string, Field][]): void {
    const index = fields.map(field => field[0]).indexOf(field[0]);

    if (index >= 0) {
      fields.splice(index, 1);
    }
    this.query.rules = fields.map(field => ({ field: field[0], operator: 'is not null', value: null }));

    if (control) {
      control.setValue(null);
    }
  }

  select(event: MatAutocompleteSelectedEvent, input: HTMLInputElement, control: FormControl<[string, Field] | string | null>, fields: [string, Field][]): void {
    const value = event.option.value as [string, Field];

    if (fields.map(field => field[0]).indexOf(value[0]) < 0) {
      fields.push(value);
    }
    this.query.rules = fields.map(field => ({ field: field[0], operator: 'is not null', value: null }));

    input.value = '';
    control.setValue(null);
    event.option.deselect();
  }

  addClientPort() {
    if (!this.formGroup.valid) {
      this.formGroup.markAllAsTouched();
      return;
    }

    let protocolKey = '';
    for (const key of this.formProtocolKey) {
      protocolKey += this.getProtocolControlValue(key) + '|';
    }
    if (protocolKey.length) {
      protocolKey = protocolKey.substring(0, protocolKey.length - 1);
    }

    const client = this.formGroup.controls.client.value;
    const clientMedia = this.formGroup.controls.clientMedia.value;
    if (!client || !clientMedia) {
      this.formGroup.markAllAsTouched();
      return;
    }

    const clientPort: ClientPort = {
      id: null,
      deleted: false,
      client,
      clientMedia,
      name: this.formGroup.controls.name.value,
      format: this.formGroup.controls.format.value,
      budget: this.formGroup.controls.budget.value,
      tagId: protocolKey,
      mode: this.formGroup.controls.mode.getRawValue(),
      appname: this.formGroup.controls.appname.value,
      apppackage: this.formGroup.controls.apppackage.value,
      filter: this.formGroup.controls.filter.value ? JSON.stringify(this.query) : null,
      filterType: this.formGroup.controls.filter.value ? this.queryType : null,
      remark: this.formGroup.controls.remark.value,
      createTime: null,
      updateTime: null,
      connection: [],
    };

    this.clientPortAPI.addClientPort(clientPort).subscribe(clientPort => {
      const requests = [];
      for (const trafficControl of this.trafficControls) {
        if (trafficControl.limitation >= 0) {
          trafficControl.clientPort = clientPort.id;
          requests.push(this.trafficControlAPI.addTrafficControl(trafficControl));
        }
      }
      for (const antiFraud of this.antiFrauds) {
        if (antiFraud.limitation >= 0) {
          antiFraud.clientPort = clientPort.id;
          requests.push(this.antiFraudAPI.addAntiFraud(antiFraud));
        }
      }

      if (requests.length > 0) {
        forkJoin(requests).subscribe(() => {
          this.snackBar.open('上游广告位已创建', 'OK', {
            duration: 2000,
          });

          this.changed.emit(true);
        });
      } else {
        this.snackBar.open('上游广告位已创建', 'OK', {
          duration: 2000,
        });

        this.changed.emit(true);
      }
    });
  }

  updateClientPort() {
    if (!this.formGroup.valid) {
      this.formGroup.markAllAsTouched();
      return;
    }

    const clientPort = this.clientPort();
    const client = this.formGroup.controls.client.value;
    const clientMedia = this.formGroup.controls.clientMedia.value;
    if (!clientPort || !client || !clientMedia) {
      return;
    }

    let protocolKey = '';
    for (const key of this.formProtocolKey) {
      protocolKey += this.getProtocolControlValue(key) + '|';
    }
    if (protocolKey.length) {
      protocolKey = protocolKey.substring(0, protocolKey.length - 1);
    }

    clientPort.client = client;
    clientPort.clientMedia = clientMedia;
    clientPort.name = this.formGroup.controls.name.value;
    clientPort.format = this.formGroup.controls.format.value;
    clientPort.budget = this.formGroup.controls.budget.value;
    clientPort.tagId = protocolKey;
    clientPort.mode = this.formGroup.controls.mode.getRawValue();
    clientPort.appname = this.formGroup.controls.appname.value;
    clientPort.apppackage = this.formGroup.controls.apppackage.value;
    clientPort.filter = this.formGroup.controls.filter.value ? JSON.stringify(this.query) : null;
    clientPort.filterType = this.formGroup.controls.filter.value ? this.queryType : null;
    clientPort.remark = this.formGroup.controls.remark.value;

    this.clientPortAPI.updateClientPort(clientPort.id!, clientPort).subscribe(() => {
      const requests = [];
      for (const trafficControl of this.trafficControls) {
        if (trafficControl.limitation >= 0) {
          if (trafficControl.clientPort === null) {
            trafficControl.clientPort = clientPort.id;
          }
          if (trafficControl.id === null) {
            requests.push(this.trafficControlAPI.addTrafficControl(trafficControl));
          }
        } else {
          if (trafficControl.id !== null) {
            requests.push(this.trafficControlAPI.removeTrafficControl(trafficControl.id));
          }
        }
      }
      for (const antiFraud of this.antiFrauds) {
        if (antiFraud.limitation >= 0) {
          if (antiFraud.clientPort === null) {
            antiFraud.clientPort = clientPort.id;
          }
          if (antiFraud.id === null) {
            requests.push(this.antiFraudAPI.addAntiFraud(antiFraud));
          }
        } else {
          if (antiFraud.id !== null) {
            requests.push(this.antiFraudAPI.removeAntiFraud(antiFraud.id));
          }
        }
      }

      if (requests.length > 0) {
        forkJoin(requests).subscribe(() => {
          this.snackBar.open('上游广告位已修改', 'OK', {
            duration: 2000,
          });

          this.changed.emit(true);
        });
      } else {
        this.snackBar.open('上游广告位已修改', 'OK', {
          duration: 2000,
        });

        this.changed.emit(true);
      }
    });
  }

  removeClientPort() {
    const clientPort = this.clientPort();

    if (clientPort) {
      if (clientPort.connection.filter(connection => !connection.deleted).length > 0) {
        this.snackBar.open('存在已配置的连接，不能删除广告位', undefined, {
          duration: 2000,
        });

        return;
      }

      this.clientPortAPI.removeClientPort(clientPort.id!).subscribe(() => {
        this.snackBar.open('上游广告位已删除', 'OK', {
          duration: 2000,
        });

        this.changed.emit(true);
      });
    }
  }

  cancelClientPort() {
    this.changed.emit(false);
  }

  connectionChanged() {
    this.clientPortAPI.getClientPort(this.clientPort()!.id!).subscribe(clientPort => {
      this.connections = clientPort.connection.filter(connection => !connection.deleted).filter(connection => !connection.vendorPort.deleted);
    });
  }

  changeFilterType(event: MatButtonToggleChange) {
    if (event.value === 'simple') {
      const dialogRef = this.dialog.open(ConfirmDialogComponent, {
        data: '切换到精简版会清空已配置的过滤条件，是否继续？',
        maxWidth: '40vw',
        maxHeight: '40vh',
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          this.query = {
            condition: 'and',
            rules: [],
          };
          this.selectedFilters = [];
          this.queryType = 'simple';
        } else {
          const queryTypeToggleGroup = this.queryTypeToggleGroup();
          if (queryTypeToggleGroup) {
            queryTypeToggleGroup.value = this.queryType;
          }
        }
      });
    }
    if (event.value === 'advanced') {
      this.selectedFilters = [];
      this.queryType = 'advanced';
    }
    if (event.value === 'predefined1') {
      this.query = {
        condition: 'and',
        rules:[
          { field: 'device#ua', operator: 'is not null', value: null },
          { field: 'device#ip' , operator: 'is not null', value: null },
          { field: 'device#type', operator: 'is not null', value: null },
          { field: 'device#make', operator: 'is not null', value: null },
          { field: 'device#model', operator: 'is not null', value: null },
          { field: 'device#os', operator: 'is not null', value: null },
          { field: 'device#osv', operator: 'is not null', value: null },
          { field: 'device#oslevel', operator: 'is not null', value: null },
          { field: 'device#carrier', operator: 'is not null', value: null },
          { field: 'device#contype', operator: 'is not null', value: null },
          { field: 'device#w', operator: 'is not null', value: null },
          { field: 'device#h', operator: 'is not null', value: null },
          { field: 'id#501', operator: 'is not null', value: null },
          { field: 'id#505', operator: 'is not null', value: null },
          { field: 'id#509', operator: 'is not null', value: null },
        ]
      };
      this.selectedFilters = this.query.rules.map(rule => {
        const field = rule.field;
        return this.simpleFields[this.simpleFields.map(field => field[0]).indexOf(field)];
      });
      this.queryType = 'predefined1';
    }
    if (event.value === 'predefined2') {
      this.query = {
        condition: 'and',
        rules:[
          { field: 'device#ua', operator: 'is not null', value: null },
          { field: 'device#ip' , operator: 'is not null', value: null },
          { field: 'device#type', operator: 'is not null', value: null },
          { field: 'device#make', operator: 'is not null', value: null },
          { field: 'device#model', operator: 'is not null', value: null },
          { field: 'device#os', operator: 'is not null', value: null },
          { field: 'device#osv', operator: 'is not null', value: null },
          { field: 'device#oslevel', operator: 'is not null', value: null },
          { field: 'device#carrier', operator: 'is not null', value: null },
          { field: 'device#contype', operator: 'is not null', value: null },
          { field: 'device#w', operator: 'is not null', value: null },
          { field: 'device#h', operator: 'is not null', value: null },
          { field: 'device#sysdisksize', operator: 'is not null', value: null },
          { field: 'device#sysmemory', operator: 'is not null', value: null },
          { field: 'device#hwname', operator: 'is not null', value: null },
          { field: 'device#hwmachine', operator: 'is not null', value: null },
          { field: 'device#hwmodel', operator: 'is not null', value: null },
          { field: 'device#country', operator: 'is not null', value: null },
          { field: 'device#lang', operator: 'is not null', value: null },
          { field: 'device#timezone', operator: 'is not null', value: null },
          { field: 'device#boottime', operator: 'is not null', value: null },
          { field: 'device#updatetime', operator: 'is not null', value: null },
          { field: 'id#513', operator: 'is not null', value: null },
          { field: 'id#505', operator: 'is not null', value: null },
          { field: 'id#509', operator: 'is not null', value: null },
        ]
      };
      this.selectedFilters = this.query.rules.map(rule => {
        const field = rule.field;
        return this.simpleFields[this.simpleFields.map(field => field[0]).indexOf(field)];
      });
      this.queryType = 'predefined2';
    }
    if (event.value === 'predefined3') {
      this.query = {
        condition: 'and',
        rules:[
          { field: 'device#brand', operator: 'is not null', value: null },
          { field: 'device#inittime' , operator: 'is not null', value: null },
          { field: 'device#updatetime', operator: 'is not null', value: null },
          { field: 'device#updatetime', operator: 'is not null', value: null },
        ]
      };
      this.selectedFilters = this.query.rules.map(rule => {
        const field = rule.field;
        return this.simpleFields[this.simpleFields.map(field => field[0]).indexOf(field)];
      });
      this.queryType = 'predefined3';
    }
    if (event.value === 'predefined4') {
      this.query = {
        condition: 'and',
        rules:[
          { field: 'device#boottime', operator: 'is not null', value: null },
          { field: 'device#inittime' , operator: 'is not null', value: null },
          { field: 'device#updatetime', operator: 'is not null', value: null },
        ]
      };
      this.selectedFilters = this.query.rules.map(rule => {
        const field = rule.field;
        return this.simpleFields[this.simpleFields.map(field => field[0]).indexOf(field)];
      });
      this.queryType = 'predefined4';
    }
  }

  getValidTrafficControls(): TrafficControl[] {
    return this.trafficControls?.filter(tc => tc.limitation >= 0);
  }

  addTrafficControl() {
    const clientPort = this.clientPort();

    const dialogRef = this.dialog.open<TrafficControlDialogComponent, TrafficControl>(TrafficControlDialogComponent, {
      data: {
        id: null,
        clientPort: clientPort ? clientPort.id : null,
        vendorPort: -1,
        bundle: '',
        indicator: TrafficControlIndicator.TC_INDICATOR_REQUEST,
        period: TrafficControlPeriod.TC_PERIOD_SECOND,
        limitation: 0,
      },
      minWidth: '50vw',
      maxWidth: '50vw',
    });

    dialogRef.afterClosed().subscribe(trafficControl => {
      if (trafficControl) {
        this.trafficControls.push(trafficControl);
      }
    });
  }

  removeTrafficControl(trafficControl: TrafficControl) {
    trafficControl.limitation = -1;
  }

  getValidAntiFrauds(): AntiFraud[] {
    return this.antiFrauds?.filter(af => af.limitation >= 0);
  }

  addAntiFraud() {
    const clientPort = this.clientPort();

    const dialogRef = this.dialog.open<AntiFraudDialogComponent, AntiFraud>(AntiFraudDialogComponent, {
      data: {
        id: null,
        clientPort: clientPort ? clientPort.id : null,
        rule: '',
        period: AntiFraudPeriod.AF_PERIOD_SECOND,
        limitation: 0,
      },
      minWidth: '50vw',
      maxWidth: '50vw',
    });

    dialogRef.afterClosed().subscribe(antiFraud => {
      if (antiFraud) {
        this.antiFrauds.push(antiFraud);
      }
    });
  }

  removeAntiFraud(antiFraud: AntiFraud) {
    antiFraud.limitation = -1;
  }

}
