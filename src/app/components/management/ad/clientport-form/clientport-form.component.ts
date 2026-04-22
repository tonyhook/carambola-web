import { AfterViewInit, Component, effect, input, output, signal, WritableSignal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UntypedFormGroup, UntypedFormBuilder, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
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

import { Client, ClientAPI, ClientMedia, ClientMediaAPI, ClientPort, ClientPortAPI, Connection, PartnerType, PortType } from '../../../../core';
import { TenantService } from '../../../../services';
import { ConnectionComponent, FilteredSelectClientComponent, FilteredSelectClientMediaComponent } from '../../../../shared';

@Component({
  selector: 'carambola-clientport-form',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatCheckboxModule,
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
  ],
  templateUrl: './clientport-form.component.html',
  styleUrls: ['./clientport-form.component.scss'],
})
export class ClientPortFormComponent implements AfterViewInit {
  private formBuilder = inject(UntypedFormBuilder);
  private snackBar = inject(MatSnackBar);
  private tenantService = inject(TenantService);
  private clientAPI = inject(ClientAPI);
  private clientMediaAPI = inject(ClientMediaAPI);
  private clientPortAPI = inject(ClientPortAPI);

  PartnerType = PartnerType;
  PortType = PortType;

  formGroup: UntypedFormGroup;
  clients: WritableSignal<Client[]> = signal([]);
  managedClients: WritableSignal<Client[]> = signal([]);
  clientMedias: WritableSignal<ClientMedia[]> = signal([]);
  managedClientMedias: WritableSignal<ClientMedia[]> = signal([]);
  formClientId: WritableSignal<number> = signal(0);

  initialized = false;

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
  selectedIndex = 0;

  query: RuleSet = {
    condition: 'and',
    rules: [],
  };

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
      'client': [null, Validators.required],
      'clientMedia': [null, Validators.required],
      'name': ['', Validators.required],
      'format': ['banner', Validators.required],
      'mode': [PortType.PORT_TYPE_SHARE, Validators.required],
      'ekey': ['', null],
      'ikey': ['', null],
      'filter': [false, null],
      'remark': ['', null],
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

                this.formGroup.setControl('client', this.formBuilder.control({value: client, disabled: this.readonly}, Validators.required), {emitEvent: false});
                this.formGroup.setControl('clientMedia', this.formBuilder.control({value: clientMedia, disabled: this.readonly}, Validators.required), {emitEvent: false});

                this.query = {
                  condition: 'and',
                  rules: [],
                };

                if (this.mode() === PartnerType.PARTNER_TYPE_DIRECT) {
                  this.formProtocolKey = ['id'];
                  this.formGroup.addControl('id', this.formBuilder.control({value: '', disabled: this.readonly}, Validators.required), {emitEvent: false});
                  this.formGroup.setControl('mode', this.formBuilder.control({value: PortType.PORT_TYPE_DIRECT, disabled: true}, Validators.required), {emitEvent: false});
                }
                if (this.mode() === PartnerType.PARTNER_TYPE_PROGRAMMATIC) {
                  this.formProtocolKey = client.protocolKey;
                  for (const key of client.protocolKey) {
                    this.formGroup.addControl(key, this.formBuilder.control({value: '', disabled: this.readonly}, Validators.required), {emitEvent: false});
                  }
                  this.formGroup.setControl('mode', this.formBuilder.control({value: PortType.PORT_TYPE_SHARE, disabled: false}, Validators.required), {emitEvent: false});
                }
              }
            }
          } else {
            this.initialized = true;

            this.connections = [];

            this.formGroup.setControl('client', this.formBuilder.control(null, Validators.required), {emitEvent: false});
            this.formGroup.setControl('clientMedia', this.formBuilder.control({value: null, disabled: true}, Validators.required), {emitEvent: false});

            this.query = {
              condition: 'and',
              rules: [],
            };

            if (this.mode() === PartnerType.PARTNER_TYPE_DIRECT) {
              this.formProtocolKey = ['id'];
              this.formGroup.addControl('id', this.formBuilder.control({value: '', disabled: this.readonly}, Validators.required), {emitEvent: false});
              this.formGroup.setControl('mode', this.formBuilder.control({value: PortType.PORT_TYPE_DIRECT, disabled: true}, Validators.required), {emitEvent: false});
            }
            if (this.mode() === PartnerType.PARTNER_TYPE_PROGRAMMATIC) {
              this.formGroup.setControl('mode', this.formBuilder.control({value: PortType.PORT_TYPE_SHARE, disabled: false}, Validators.required), {emitEvent: false});
            }
          }
        } else {
          this.clientPortAPI.getClientPort(this.clientPort()!.id!).subscribe(clientPort => {
            this.clientPortFull = clientPort;

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
              this.selectedIndex = tab === 'property' ? 0 : 1;

              this.formGroup.setControl('client', this.formBuilder.control({value: client, disabled: this.readonly}, Validators.required), {emitEvent: false});
              this.formGroup.setControl('clientMedia', this.formBuilder.control({value: clientMedia, disabled: this.readonly}, Validators.required), {emitEvent: false});
              this.formGroup.setControl('name', this.formBuilder.control({value: clientPort.name, disabled: this.readonly}, Validators.required), {emitEvent: false});
              this.formGroup.setControl('format', this.formBuilder.control({value: clientPort.format, disabled: this.readonly}, Validators.required), {emitEvent: false});
              this.formGroup.setControl('mode', this.formBuilder.control({value: clientPort.mode, disabled: this.readonly}, Validators.required), {emitEvent: false});
              this.formGroup.setControl('ekey', this.formBuilder.control({value: clientPort.ekey, disabled: this.readonly}, null), {emitEvent: false});
              this.formGroup.setControl('ikey', this.formBuilder.control({value: clientPort.ikey, disabled: this.readonly}), {emitEvent: false});
              this.formGroup.setControl('filter', this.formBuilder.control({value: clientPort.filter !== null && clientPort.filter.length > 0, disabled: this.readonly}, null), {emitEvent: false});
              this.formGroup.setControl('remark', this.formBuilder.control({value: clientPort.remark, disabled: this.readonly}, null), {emitEvent: false});

              if (clientPort.filter !== null && clientPort.filter.length > 0) {
                this.query = JSON.parse(clientPort.filter);
              } else {
                this.query = {
                  condition: 'and',
                  rules: [],
                };
              }

              if (this.mode() === PartnerType.PARTNER_TYPE_DIRECT) {
                this.formProtocolKey = ['id'];
                this.formGroup.addControl('id', this.formBuilder.control({value: clientPort.tagId, disabled: this.readonly}, Validators.required), {emitEvent: false});
                this.formGroup.setControl('mode', this.formBuilder.control({value: PortType.PORT_TYPE_DIRECT, disabled: true}, Validators.required), {emitEvent: false});
              }
              if (this.mode() === PartnerType.PARTNER_TYPE_PROGRAMMATIC) {
                this.formProtocolKey = client.protocolKey;
                for (const [index, key] of this.formProtocolKey.entries()) {
                  this.formGroup.addControl(key, this.formBuilder.control({value: clientPort.tagId.split('|')[index], disabled: this.readonly}, Validators.required), {emitEvent: false});
                }
                this.formGroup.setControl('mode', this.formBuilder.control({value: clientPort.mode, disabled: this.readonly}, Validators.required), {emitEvent: false});
              }
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
      if (data.client !== null && data.client.id !== this.formClientId()) {
        this.formClientId.set(data.client.id);
        this.formGroup.setControl('clientMedia', this.formBuilder.control(null, Validators.required), {emitEvent: false});

        for (const key of this.formProtocolKey) {
          this.formGroup.removeControl(key, {
            emitEvent: false,
          });
        }

        if (this.mode() === PartnerType.PARTNER_TYPE_DIRECT) {
          this.formProtocolKey = ['id'];
          this.formGroup.addControl('id', this.formBuilder.control({value: '', disabled: this.readonly}, Validators.required), {emitEvent: false});
          this.formGroup.setControl('mode', this.formBuilder.control({value: PortType.PORT_TYPE_DIRECT, disabled: true}, Validators.required), {emitEvent: false});
        }
        if (this.mode() === PartnerType.PARTNER_TYPE_PROGRAMMATIC) {
          this.formProtocolKey = data.client.protocolKey;
          for (const key of data.client.protocolKey) {
            this.formGroup.addControl(key, this.formBuilder.control({value: '', disabled: this.readonly}, Validators.required), {emitEvent: false});
          }
          this.formGroup.setControl('mode', this.formBuilder.control({value: PortType.PORT_TYPE_SHARE, disabled: false}, Validators.required), {emitEvent: false});
        }

        if (this.formGroup.controls['mode'].getRawValue() !== PortType.PORT_TYPE_DIRECT) {
          for (const key of data.client.protocolKey) {
            this.formGroup.addControl(key, this.formBuilder.control({value: '', disabled: this.readonly}, Validators.required), {
              emitEvent: false,
            });
          }

          this.formProtocolKey = data.client.protocolKey;
        } else {
          this.formGroup.addControl('id', this.formBuilder.control({value: '', disabled: this.readonly}, Validators.required), {
            emitEvent: false,
          });

          this.formProtocolKey = ['id'];
        }

        if (this.tenantService.isTenantManager() || this.tenantService.isManager()) {
          this.managedClientMedias.set(this.clientMedias().filter(clientMedia => clientMedia.client.id === data.client.id));
        }
      }
    });
  }

  addClientPort() {
    if (!this.formGroup.valid) {
      this.formGroup.markAllAsTouched();
      return;
    }

    let protocolKey = '';
    for (const key of this.formProtocolKey) {
      protocolKey += this.formGroup.value[key] + '|';
    }
    if (protocolKey.length) {
      protocolKey = protocolKey.substring(0, protocolKey.length - 1);
    }

    const clientPort: ClientPort = {
      id: null,
      deleted: false,
      client: this.formGroup.value.client,
      clientMedia: this.formGroup.value.clientMedia,
      name: this.formGroup.value.name,
      format: this.formGroup.value.format,
      tagId: protocolKey,
      mode: this.formGroup.getRawValue().mode,
      ekey: this.formGroup.value.ekey,
      ikey: this.formGroup.value.ikey,
      filter: this.formGroup.value.filter ? JSON.stringify(this.query) : null,
      remark: this.formGroup.value.remark,
      createTime: null,
      updateTime: null,
      connection: [],
    };

    this.clientPortAPI.addClientPort(clientPort).subscribe(() => {
      this.snackBar.open('上游广告位已创建', 'OK', {
        duration: 2000,
      });

      this.changed.emit(true);
    });
  }

  updateClientPort() {
    if (!this.formGroup.valid) {
      this.formGroup.markAllAsTouched();
      return;
    }

    const clientPort = this.clientPort();
    if (!clientPort) {
      return;
    }

    let protocolKey = '';
    for (const key of this.formProtocolKey) {
      protocolKey += this.formGroup.value[key] + '|';
    }
    if (protocolKey.length) {
      protocolKey = protocolKey.substring(0, protocolKey.length - 1);
    }

    clientPort.client = this.formGroup.value.client;
    clientPort.clientMedia = this.formGroup.value.clientMedia;
    clientPort.name = this.formGroup.value.name;
    clientPort.format = this.formGroup.value.format;
    clientPort.tagId = protocolKey;
    clientPort.mode = this.formGroup.getRawValue().mode;
    clientPort.ekey = this.formGroup.value.ekey;
    clientPort.ikey = this.formGroup.value.ikey;
    clientPort.filter = this.formGroup.value.filter ? JSON.stringify(this.query) : null;
    clientPort.remark = this.formGroup.value.remark;

    this.clientPortAPI.updateClientPort(clientPort.id!, clientPort).subscribe(() => {
      this.snackBar.open('上游广告位已修改', 'OK', {
        duration: 2000,
      });

      this.changed.emit(true);
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

}
