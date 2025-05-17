import { formatDate } from '@angular/common';
import { AfterViewInit, Component, Inject, OnInit } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';

import { Client, ClientAPI, ClientMedia, ClientPort, ClientPortAPI, Connection, PartnerType, PortType, Vendor, VendorAPI, VendorMedia, VendorPort, VendorPortAPI } from '../../../core';
import { FilteredSelectClientComponent } from '../filtered-select-client/filtered-select-client.component';
import { FilteredSelectClientPortComponent } from '../filtered-select-clientport/filtered-select-clientport.component';
import { FilteredSelectVendorComponent } from '../filtered-select-vendor/filtered-select-vendor.component';
import { FilteredSelectVendorPortComponent } from '../filtered-select-vendorport/filtered-select-vendorport.component';

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
    MatInputModule,
    FilteredSelectClientComponent,
    FilteredSelectClientPortComponent,
    FilteredSelectVendorComponent,
    FilteredSelectVendorPortComponent,
  ],
  templateUrl: './connection-dialog.component.html',
  styleUrls: ['./connection-dialog.component.scss'],
})
export class ConnectionDialogComponent implements OnInit, AfterViewInit {
  PortType = PortType;

  client: Client | null = null;
  clientPort: ClientPort | null = null;
  vendor: Vendor | null = null;
  vendorPort: VendorPort | null = null;
  connection: Connection | null = null;

  clients: Client[] = [];
  clientPorts: ClientPort[] = [];
  vendors: Vendor[] = [];
  vendorPorts: VendorPort[] = [];

  validClientMedias: ClientMedia[] = [];
  validClientPorts: ClientPort[] = [];
  validVendorMedias: VendorMedia[] = [];
  validVendorPorts: VendorPort[] = [];

  formGroupPort: UntypedFormGroup;
  formGroupConnection: UntypedFormGroup;

  readonly = false;

  constructor(
    private formBuilder: UntypedFormBuilder,
    private route: ActivatedRoute,
    private clientAPI: ClientAPI,
    private clientPortAPI: ClientPortAPI,
    private vendorAPI: VendorAPI,
    private vendorPortAPI: VendorPortAPI,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<ConnectionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConnectionDialogData,
  ) {
    this.formGroupPort = this.formBuilder.group({
      'client': [null, Validators.required],
      'clientPort': [null, Validators.required],
      'vendor': [null, Validators.required],
      'vendorPort': [null, Validators.required],
    });

    this.formGroupConnection = this.formBuilder.group({
      'test': [false, Validators.required],
      'validFrom': ['', Validators.required],
      'validTo': ['', Validators.required],
      'upstreamRatio': [0, [Validators.required, Validators.pattern('^[0-9]*[\\.,]?[0-9]*$'), Validators.min(0), Validators.max(100)]],
      'rebateRatio': [0, [Validators.required, Validators.pattern('^[0-9]*[\\.,]?[0-9]*$'), Validators.min(0), Validators.max(100)]],
      'platformRatio': [50, [Validators.required, Validators.pattern('^[0-9]*[\\.,]?[0-9]*$'), Validators.min(0), Validators.max(100)]],
      'defaultPrice': [0, [Validators.required, Validators.min(1)]],
      'priority': [1, Validators.required],
    });

    if (data) {
      if (data.clientPort) {
        this.clientPortAPI.getClientPort(data.clientPort.id!).subscribe(clientPort => {
          this.client = clientPort.client;
          this.clients = [clientPort.client];
          this.formGroupPort.setControl('client', this.formBuilder.control({value: this.client, disabled: true}, Validators.required), {emitEvent: false,});
        });
        this.clientPort = data.clientPort;

        this.formGroupConnection.setControl('validFrom', this.formBuilder.control({value: new Date(), disabled: this.readonly}, Validators.required), {emitEvent: false,});
        this.formGroupConnection.setControl('validTo', this.formBuilder.control({value: '2099-12-31', disabled: this.readonly}, Validators.required), {emitEvent: false,});
      }
      if (data.vendorPort) {
        this.vendorPortAPI.getVendorPort(data.vendorPort.id!).subscribe(vendorPort => {
          this.vendor = vendorPort.vendor;
          this.vendors = [vendorPort.vendor];
          this.formGroupPort.setControl('vendor', this.formBuilder.control({value: this.vendor, disabled: true}, Validators.required), {emitEvent: false,});
        });
        this.vendorPort = data.vendorPort;

        this.formGroupConnection.setControl('validFrom', this.formBuilder.control({value: new Date(), disabled: this.readonly}, Validators.required), {emitEvent: false,});
        this.formGroupConnection.setControl('validTo', this.formBuilder.control({value: '2099-12-31', disabled: this.readonly}, Validators.required), {emitEvent: false,});
      }
      if (data.connection) {
        this.connection = data.connection;
        this.clientPortAPI.getClientPort(data.connection.clientPort.id!).subscribe(clientPort => {
          this.client = clientPort.client;
          this.clients = [clientPort.client];
          this.formGroupPort.setControl('client', this.formBuilder.control({value: this.client, disabled: true}, Validators.required), {emitEvent: false,});
        });
        this.clientPort = data.connection.clientPort;
        this.vendorPortAPI.getVendorPort(data.connection.vendorPort.id!).subscribe(vendorPort => {
          this.vendor = vendorPort.vendor;
          this.vendors = [vendorPort.vendor];
          this.formGroupPort.setControl('vendor', this.formBuilder.control({value: this.vendor, disabled: true}, Validators.required), {emitEvent: false,});
        });
        this.vendorPort = data.connection.vendorPort;

        this.formGroupConnection.setControl('test', this.formBuilder.control({value: this.connection.test, disabled: this.readonly}, Validators.required), {emitEvent: false,});
        this.formGroupConnection.setControl('validFrom', this.formBuilder.control({value: this.connection.validFrom, disabled: this.readonly}, Validators.required), {emitEvent: false,});
        this.formGroupConnection.setControl('validTo', this.formBuilder.control({value: this.connection.validTo, disabled: this.readonly}, Validators.required), {emitEvent: false,});
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
      if (this.formGroupPort.getRawValue().client !== null && this.formGroupPort.getRawValue().client !== this.client) {
        this.client = this.formGroupPort.getRawValue().client;
        this.clientPort = null;
        this.validClientPorts = this.clientPorts.filter(clientPort => clientPort.client.id === this.formGroupPort.getRawValue().client.id);
        this.formGroupPort.setControl('clientPort', this.formBuilder.control({value: this.clientPort, disabled: false}, Validators.required), {emitEvent: false,});
      }
      if (this.formGroupPort.getRawValue().clientPort !== null && this.formGroupPort.getRawValue().clientPort !== this.clientPort) {
        this.clientPort = this.formGroupPort.getRawValue().clientPort;
      }
      if (this.formGroupPort.getRawValue().vendor !== null && this.formGroupPort.getRawValue().vendor !== this.vendor) {
        this.vendor = this.formGroupPort.getRawValue().vendor;
        this.vendorPort = null;
        this.validVendorPorts = this.vendorPorts.filter(vendorPort => vendorPort.vendor.id === this.formGroupPort.getRawValue().vendor.id);
        this.formGroupPort.setControl('vendorPort', this.formBuilder.control({value: this.vendorPort, disabled: false}, Validators.required), {emitEvent: false,});
      }
      if (this.formGroupPort.getRawValue().vendorPort !== null && this.formGroupPort.getRawValue().vendorPort !== this.vendorPort) {
        this.vendorPort = this.formGroupPort.getRawValue().vendorPort;
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
          this.clients = results[0].filter(client => !client.deleted);
          this.clientPorts = results[1].filter(clientPort => !clientPort.deleted);

          this.formGroupPort.setControl('client', this.formBuilder.control({value: null, disabled: this.readonly}, Validators.required), {emitEvent: false,});
          this.formGroupPort.setControl('clientPort', this.formBuilder.control({value: null, disabled: true}, Validators.required), {emitEvent: false,});
        });
      } else {
        setTimeout(() => {
          this.clients = [this.client!];
          this.validClientPorts = [this.clientPort!];

          this.formGroupPort.setControl('client', this.formBuilder.control({value: this.client, disabled: true}, Validators.required), {emitEvent: false,});
          this.formGroupPort.setControl('clientPort', this.formBuilder.control({value: this.clientPort, disabled: true}, Validators.required), {emitEvent: false,});
        }, 0);
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
          this.vendors = results[0].filter(vendor => !vendor.deleted);
          this.vendorPorts = results[1].filter(vendorPort => !vendorPort.deleted);

          this.formGroupPort.setControl('vendor', this.formBuilder.control({value: null, disabled: this.readonly}, Validators.required), {emitEvent: false,});
          this.formGroupPort.setControl('vendorPort', this.formBuilder.control({value: null, disabled: true}, Validators.required), {emitEvent: false,});
        });
      } else {
        setTimeout(() => {
          this.vendors = [this.vendor!];
          this.validVendorPorts = [this.vendorPort!];

          this.formGroupPort.setControl('vendor', this.formBuilder.control({value: this.vendor, disabled: true}, Validators.required), {emitEvent: false,});
          this.formGroupPort.setControl('vendorPort', this.formBuilder.control({value: this.vendorPort, disabled: true}, Validators.required), {emitEvent: false,});
        }, 0);
      }
    });
  }

  cancel() {
    this.dialogRef.close();
  }

  confirm() {
    const clientPort: ClientPort = this.formGroupPort.getRawValue().clientPort;
    const vendorPort: VendorPort = this.formGroupPort.getRawValue().vendorPort;

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
      const clientPort: ClientPort = this.formGroupPort.getRawValue().clientPort;
      const vendorPort: VendorPort = this.formGroupPort.getRawValue().vendorPort;

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

    const validFrom = new Date(this.formGroupConnection.value.validFrom);
    const validTo = new Date(this.formGroupConnection.value.validTo);

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
      clientPort: this.formGroupPort.getRawValue().clientPort,
      vendorPort: this.formGroupPort.getRawValue().vendorPort,
      priority: this.formGroupConnection.value.priority,
      enabled: this.connection === null ? false : this.connection.enabled,
      test: this.formGroupConnection.value.test,
      validFrom: formatDate(validFromTime, 'yyyy-MM-dd\'T\'HH:mm:ss.sssZ', 'en-US'),
      validTo: formatDate(validToTime, 'yyyy-MM-dd\'T\'HH:mm:ss.sssZ', 'en-US'),
      upstreamRatio: this.formGroupConnection.value.upstreamRatio / 100.0,
      rebateRatio: this.formGroupConnection.value.rebateRatio / 100.0,
      platformRatio: this.formGroupConnection.value.platformRatio / 100.0,
      downstreamRatio: 1 - (this.formGroupConnection.value.upstreamRatio / 100.0 + this.formGroupConnection.value.rebateRatio / 100.0 + this.formGroupConnection.value.platformRatio / 100.0),
      defaultPrice: this.formGroupConnection.value.defaultPrice,
    };

    this.dialogRef.close(connection);
  }

}
