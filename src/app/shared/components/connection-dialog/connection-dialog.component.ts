import { AfterViewInit, Component, inject, OnInit, signal } from '@angular/core';
import { formatDate } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';

import { Client, ClientAPI, ClientMedia, ClientPort, ClientPortAPI, Connection, PartnerType, PortType, TrafficControl, TrafficControlAPI, TrafficControlIndicator, TrafficControlPeriod, Vendor, VendorAPI, VendorMedia, VendorPort, VendorPortAPI } from '../../../core';
import { FilteredSelectClientComponent } from '../filtered-select-client/filtered-select-client.component';
import { FilteredSelectClientPortComponent } from '../filtered-select-clientport/filtered-select-clientport.component';
import { FilteredSelectVendorComponent } from '../filtered-select-vendor/filtered-select-vendor.component';
import { FilteredSelectVendorPortComponent } from '../filtered-select-vendorport/filtered-select-vendorport.component';
import { TrafficControlDialogComponent } from '../traffic-control-dialog/traffic-control-dialog.component';
import { TrafficControlComponent } from '../traffic-control/traffic-control.component';

interface ConnectionPortControls {
  client: FormControl<Client | null>;
  clientPort: FormControl<ClientPort | null>;
  vendor: FormControl<Vendor | null>;
  vendorPort: FormControl<VendorPort | null>;
}

interface ConnectionFormControls {
  test: FormControl<boolean | null>;
  validFrom: FormControl<Date | null>;
  validTo: FormControl<Date | null>;
  upstreamRatio: FormControl<number | null>;
  rebateRatio: FormControl<number | null>;
  platformRatio: FormControl<number | null>;
  defaultPrice: FormControl<number | null>;
  priority: FormControl<number | null>;
}

export interface ConnectionDialogData {
  clientPort: ClientPort | null;
  vendorPort: VendorPort | null;
  connection: Connection | null;
  readonly: boolean;
}

@Component({
  selector: 'carambola-connection-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    FilteredSelectClientComponent,
    FilteredSelectClientPortComponent,
    FilteredSelectVendorComponent,
    FilteredSelectVendorPortComponent,
    TrafficControlComponent,
  ],
  templateUrl: './connection-dialog.component.html',
  styleUrls: ['./connection-dialog.component.scss'],
})
export class ConnectionDialogComponent implements OnInit, AfterViewInit {
  private formBuilder = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private clientAPI = inject(ClientAPI);
  private clientPortAPI = inject(ClientPortAPI);
  private vendorAPI = inject(VendorAPI);
  private vendorPortAPI = inject(VendorPortAPI);
  private trafficControlAPI = inject(TrafficControlAPI);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  dialogRef = inject<MatDialogRef<ConnectionDialogComponent>>(MatDialogRef);
  data = inject<ConnectionDialogData>(MAT_DIALOG_DATA);

  PortType = PortType;

  client: Client | null = null;
  clientPort: ClientPort | null = null;
  vendor: Vendor | null = null;
  vendorPort: VendorPort | null = null;
  connection: Connection | null = null;
  trafficControls = signal<TrafficControl[]>([]);

  clients = signal<Client[]>([]);
  clientPorts: ClientPort[] = [];
  vendors = signal<Vendor[]>([]);
  vendorPorts: VendorPort[] = [];

  validClientMedias: ClientMedia[] = [];
  validClientPorts = signal<ClientPort[]>([]);
  validVendorMedias: VendorMedia[] = [];
  validVendorPorts = signal<VendorPort[]>([]);

  formGroupPort: FormGroup<ConnectionPortControls>;
  formGroupConnection: FormGroup<ConnectionFormControls>;

  readonly = false;

  constructor() {
    const data = this.data;

    this.formGroupPort = this.formBuilder.group({
      client: this.formBuilder.control<Client | null>(null, Validators.required),
      clientPort: this.formBuilder.control<ClientPort | null>(null, Validators.required),
      vendor: this.formBuilder.control<Vendor | null>(null, Validators.required),
      vendorPort: this.formBuilder.control<VendorPort | null>(null, Validators.required),
    });

    this.formGroupConnection = this.formBuilder.group({
      test: this.formBuilder.control<boolean | null>(false, Validators.required),
      validFrom: this.formBuilder.control<Date | null>(null, Validators.required),
      validTo: this.formBuilder.control<Date | null>(null, Validators.required),
      upstreamRatio: this.formBuilder.control<number | null>(0, [Validators.required, Validators.pattern('^[0-9]*[\\.,]?[0-9]*$'), Validators.min(0), Validators.max(100)]),
      rebateRatio: this.formBuilder.control<number | null>(0, [Validators.required, Validators.pattern('^[0-9]*[\\.,]?[0-9]*$'), Validators.min(0), Validators.max(100)]),
      platformRatio: this.formBuilder.control<number | null>(50, [Validators.required, Validators.pattern('^[0-9]*[\\.,]?[0-9]*$'), Validators.min(0), Validators.max(100)]),
      defaultPrice: this.formBuilder.control<number | null>(0, [Validators.required, Validators.min(1)]),
      priority: this.formBuilder.control<number | null>(1, Validators.required),
    });

    if (data) {
      if (data.clientPort) {
        this.clientPortAPI.getClientPort(data.clientPort.id!).subscribe(clientPort => {
          this.client = clientPort.client;
          this.clients.set([clientPort.client]);
          this.formGroupPort.setControl('client', this.formBuilder.control({value: this.client, disabled: true}, Validators.required), {emitEvent: false,});
        });
        this.clientPort = data.clientPort;

        this.formGroupConnection.setControl('validFrom', this.formBuilder.control({value: new Date(), disabled: this.readonly}, Validators.required), {emitEvent: false,});
        this.formGroupConnection.setControl('validTo', this.formBuilder.control({value: new Date('2099-12-31'), disabled: this.readonly}, Validators.required), {emitEvent: false,});
      }
      if (data.vendorPort) {
        this.vendorPortAPI.getVendorPort(data.vendorPort.id!).subscribe(vendorPort => {
          this.vendor = vendorPort.vendor;
          this.vendors.set([vendorPort.vendor]);
          this.formGroupPort.setControl('vendor', this.formBuilder.control({value: this.vendor, disabled: true}, Validators.required), {emitEvent: false,});
        });
        this.vendorPort = data.vendorPort;

        this.formGroupConnection.setControl('validFrom', this.formBuilder.control({value: new Date(), disabled: this.readonly}, Validators.required), {emitEvent: false,});
        this.formGroupConnection.setControl('validTo', this.formBuilder.control({value: new Date('2099-12-31'), disabled: this.readonly}, Validators.required), {emitEvent: false,});
      }
      if (data.connection) {
        this.connection = data.connection;
        this.clientPortAPI.getClientPort(data.connection.clientPort.id!).subscribe(clientPort => {
          this.client = clientPort.client;
          this.clients.set([clientPort.client]);
          this.formGroupPort.setControl('client', this.formBuilder.control({value: this.client, disabled: true}, Validators.required), {emitEvent: false,});
        });
        this.clientPort = data.connection.clientPort;
        this.vendorPortAPI.getVendorPort(data.connection.vendorPort.id!).subscribe(vendorPort => {
          this.vendor = vendorPort.vendor;
          this.vendors.set([vendorPort.vendor]);
          this.formGroupPort.setControl('vendor', this.formBuilder.control({value: this.vendor, disabled: true}, Validators.required), {emitEvent: false,});
        });
        this.vendorPort = data.connection.vendorPort;

        this.formGroupConnection.setControl('test', this.formBuilder.control({value: this.connection.test, disabled: this.readonly}, Validators.required), {emitEvent: false,});
        this.formGroupConnection.setControl('validFrom', this.formBuilder.control({value: new Date(this.connection.validFrom), disabled: this.readonly}, Validators.required), {emitEvent: false,});
        this.formGroupConnection.setControl('validTo', this.formBuilder.control({value: new Date(this.connection.validTo), disabled: this.readonly}, Validators.required), {emitEvent: false,});
        this.formGroupConnection.setControl('upstreamRatio', this.formBuilder.control({value: this.connection.upstreamRatio * 100, disabled: this.readonly}, [Validators.required, Validators.pattern('^[0-9]*[\\.,]?[0-9]*$'), Validators.min(0), Validators.max(100)]), {emitEvent: false,});
        this.formGroupConnection.setControl('rebateRatio', this.formBuilder.control({value: this.connection.rebateRatio * 100, disabled: this.readonly}, [Validators.required, Validators.pattern('^[0-9]*[\\.,]?[0-9]*$'), Validators.min(0), Validators.max(100)]), {emitEvent: false,});
        this.formGroupConnection.setControl('platformRatio', this.formBuilder.control({value: this.connection.platformRatio * 100, disabled: this.readonly}, [Validators.required, Validators.pattern('^[0-9]*[\\.,]?[0-9]*$'), Validators.min(0), Validators.max(100)]), {emitEvent: false,});
        this.formGroupConnection.setControl('defaultPrice', this.formBuilder.control({value: this.connection.defaultPrice, disabled: this.readonly}, [Validators.required, Validators.min(1)]), {emitEvent: false,});
        this.formGroupConnection.setControl('priority', this.formBuilder.control({value: this.connection.priority, disabled: this.readonly}, Validators.required), {emitEvent: false,});
      }
      this.readonly = data.readonly;
    }
  }

  ngOnInit() {
    this.formGroupPort.valueChanges.subscribe(() => {
      const rawPort = this.formGroupPort.getRawValue();

      if (rawPort.client !== null && rawPort.client !== this.client) {
        this.client = rawPort.client;
        this.clientPort = null;
        this.validClientPorts.set(this.clientPorts.filter(clientPort => clientPort.client.id === rawPort.client!.id));
        this.formGroupPort.setControl('clientPort', this.formBuilder.control({value: this.clientPort, disabled: false}, Validators.required), {emitEvent: false,});
      }
      if (rawPort.clientPort !== null && rawPort.clientPort !== this.clientPort) {
        this.clientPort = rawPort.clientPort;
      }
      if (rawPort.vendor !== null && rawPort.vendor !== this.vendor) {
        this.vendor = rawPort.vendor;
        this.vendorPort = null;
        this.validVendorPorts.set(this.vendorPorts.filter(vendorPort => vendorPort.vendor.id === rawPort.vendor!.id));
        this.formGroupPort.setControl('vendorPort', this.formBuilder.control({value: this.vendorPort, disabled: false}, Validators.required), {emitEvent: false,});
      }
      if (rawPort.vendorPort !== null && rawPort.vendorPort !== this.vendorPort) {
        this.vendorPort = rawPort.vendorPort;
      }
    });
  }

  ngAfterViewInit() {
    this.route.queryParams.subscribe(params => {
      let mode = PartnerType.PARTNER_TYPE_PROGRAMMATIC;
      if (params['directMode']) {
        mode = params['directMode'] === 'true' ? PartnerType.PARTNER_TYPE_DIRECT : PartnerType.PARTNER_TYPE_PROGRAMMATIC;
      } else {
        mode = PartnerType.PARTNER_TYPE_PROGRAMMATIC;
      }

      if (!this.clientPort) {
        forkJoin([
          this.clientAPI.getClientList({
            filter: {
              mode: [String(mode)],
            },
            searchKey: [],
            searchValue: '',
          }),
          this.clientPortAPI.getClientPortList({
            filter: {
              clientMode: [String(mode)],
            },
            searchKey: [],
            searchValue: '',
          }),
        ]).subscribe(results => {
          this.clients.set(results[0].filter(client => !client.deleted));
          this.clientPorts = results[1].filter(clientPort => !clientPort.deleted);

          this.formGroupPort.setControl('client', this.formBuilder.control({value: null, disabled: this.readonly}, Validators.required), {emitEvent: false,});
          this.formGroupPort.setControl('clientPort', this.formBuilder.control({value: null, disabled: true}, Validators.required), {emitEvent: false,});
        });
      } else {
        this.clients.set([this.client!]);
        this.validClientPorts.set([this.clientPort!]);

        this.formGroupPort.setControl('client', this.formBuilder.control({value: this.client, disabled: true}, Validators.required), {emitEvent: false,});
        this.formGroupPort.setControl('clientPort', this.formBuilder.control({value: this.clientPort, disabled: true}, Validators.required), {emitEvent: false,});
      }

      if (!this.vendorPort) {
        forkJoin([
          this.vendorAPI.getVendorList({
            filter: {
              mode: [String(mode)],
            },
            searchKey: [],
            searchValue: '',
          }),
          this.vendorPortAPI.getVendorPortList({
            filter: {
              vendorMode: [String(mode)],
            },
            searchKey: [],
            searchValue: '',
          }),
        ]).subscribe(results => {
          this.vendors.set(results[0].filter(vendor => !vendor.deleted));
          this.vendorPorts = results[1].filter(vendorPort => !vendorPort.deleted);

          this.formGroupPort.setControl('vendor', this.formBuilder.control({value: null, disabled: this.readonly}, Validators.required), {emitEvent: false,});
          this.formGroupPort.setControl('vendorPort', this.formBuilder.control({value: null, disabled: true}, Validators.required), {emitEvent: false,});
        });
      } else {
        this.vendors.set([this.vendor!]);
        this.validVendorPorts.set([this.vendorPort!]);

        this.formGroupPort.setControl('vendor', this.formBuilder.control({value: this.vendor, disabled: true}, Validators.required), {emitEvent: false,});
        this.formGroupPort.setControl('vendorPort', this.formBuilder.control({value: this.vendorPort, disabled: true}, Validators.required), {emitEvent: false,});
      }

      if (this.connection) {
        this.trafficControlAPI.getTrafficControlListByPort(this.connection.clientPort.id!, this.connection.vendorPort.id!).subscribe(trafficControls => {
          this.trafficControls.set(trafficControls);
        });
      }
    });
  }

  cancel() {
    this.dialogRef.close();
  }

  confirm() {
    const rawPort = this.formGroupPort.getRawValue();
    const clientPort = rawPort.clientPort;
    const vendorPort = rawPort.vendorPort;

    if (clientPort && vendorPort && clientPort.mode === PortType.PORT_TYPE_SHARE && vendorPort.mode === PortType.PORT_TYPE_BIDDING) {
      this.snackBar.open('竞价模式的下游端口不能对应分成模式的上游端口', undefined, {
        duration: 3000,
      });
      return;
    }

    if (clientPort && vendorPort && clientPort.mode === PortType.PORT_TYPE_DIRECT && vendorPort.mode !== PortType.PORT_TYPE_DIRECT) {
      this.snackBar.open('直通模式的上游端口不能对应非直通模式的下游端口', undefined, {
        duration: 3000,
      });
      return;
    }
    if (clientPort && vendorPort && clientPort.mode !== PortType.PORT_TYPE_DIRECT && vendorPort.mode === PortType.PORT_TYPE_DIRECT) {
      this.snackBar.open('直通模式的下游端口不能对应非直通模式的上游端口', undefined, {
        duration: 3000,
      });
      return;
    }

    if (!this.formGroupPort.valid && !this.formGroupPort.disabled) {
      this.formGroupPort.markAllAsTouched();
      return;
    }
    if (!this.formGroupConnection.valid) {
      if (this.formGroupPort.getRawValue().clientPort?.mode === PortType.PORT_TYPE_DIRECT) {
        this.formGroupConnection.setControl('defaultPrice', this.formBuilder.control(1, [Validators.required, Validators.min(1)]), {emitEvent: false,});
      } else {
        this.formGroupConnection.markAllAsTouched();
        return;
      }
    }

    if (this.connection === null) {
      const clientPort = rawPort.clientPort!;
      const vendorPort = rawPort.vendorPort!;

      if (vendorPort.connection.filter(connection => !connection.deleted).map(connection => connection.clientPort.id).indexOf(clientPort.id) >= 0) {
        this.snackBar.open('连接已经存在，不能重复创建', undefined, {
          duration: 3000,
        });
        return;
      }

      if (vendorPort.connection.filter(connection => connection.deleted).map(connection => connection.clientPort.id).indexOf(clientPort.id) >= 0) {
        this.connection = vendorPort.connection.filter(connection => connection.deleted)[0];
      }
    }

    const validFrom = this.formGroupConnection.controls.validFrom.value!;
    const validTo = this.formGroupConnection.controls.validTo.value!;

    const validFromTime = new Date(
      validFrom.getFullYear(),
      validFrom.getMonth(),
      validFrom.getDate(),
      0, 0, 0, 0
    ).getTime();

    const validToTime = new Date(
      validTo.getFullYear(),
      validTo.getMonth(),
      validTo.getDate(),
      23, 59, 59, 999
    ).getTime();

    const connection: Connection = {
      id: this.connection === null ? null : this.connection.id,
      deleted: false,
      clientPort: rawPort.clientPort!,
      vendorPort: rawPort.vendorPort!,
      priority: this.formGroupConnection.controls.priority.value!,
      enabled: this.connection === null ? false : this.connection.enabled,
      test: this.formGroupConnection.controls.test.value!,
      validFrom: formatDate(validFromTime, 'yyyy-MM-dd\'T\'HH:mm:ss.sssZ', 'en-US'),
      validTo: formatDate(validToTime, 'yyyy-MM-dd\'T\'HH:mm:ss.sssZ', 'en-US'),
      upstreamRatio: this.formGroupConnection.controls.upstreamRatio.value! / 100.0,
      rebateRatio: this.formGroupConnection.controls.rebateRatio.value! / 100.0,
      platformRatio: this.formGroupConnection.controls.platformRatio.value! / 100.0,
      downstreamRatio: 1 - (
        this.formGroupConnection.controls.upstreamRatio.value! / 100.0 +
        this.formGroupConnection.controls.rebateRatio.value! / 100.0 +
        this.formGroupConnection.controls.platformRatio.value! / 100.0
      ),
      defaultPrice: this.formGroupConnection.controls.defaultPrice.value!,
    };

    const requests = [];
    for (const trafficControl of this.trafficControls()) {
      if (trafficControl.limitation !== -1) {
        if (trafficControl.clientPort === null) {
          trafficControl.clientPort = connection.clientPort.id;
        }
        if (trafficControl.vendorPort === null) {
          trafficControl.vendorPort = connection.vendorPort.id;
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

    if (requests.length > 0) {
      forkJoin(requests).subscribe(() => {
        this.dialogRef.close(connection);
      });
    } else {
      this.dialogRef.close(connection);
    }
  }

  getValidTrafficControls(): TrafficControl[] {
    return this.trafficControls().filter(tc => tc.limitation >= 0);
  }

  addTrafficControl() {
    const dialogRef = this.dialog.open<TrafficControlDialogComponent, TrafficControl>(TrafficControlDialogComponent, {
      data: {
        id: null,
        clientPort: this.connection ? this.connection.clientPort.id : null,
        vendorPort: this.connection ? this.connection.vendorPort.id : null,
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
        this.trafficControls.update(trafficControls => [...trafficControls, trafficControl]);
      }
    });
  }

  removeTrafficControl(trafficControl: TrafficControl) {
    this.trafficControls.update(trafficControls => trafficControls.map(currentTrafficControl => {
      if (currentTrafficControl !== trafficControl) {
        return currentTrafficControl;
      }
      return {
        ...currentTrafficControl,
        limitation: -1,
      };
    }));
  }

}
