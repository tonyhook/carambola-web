import { AfterViewInit, Component, effect, input, output, signal, WritableSignal, inject } from '@angular/core';
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

import { Connection, PartnerType, PortType, Vendor, VendorAPI, VendorMedia, VendorMediaAPI, VendorPort, VendorPortAPI } from '../../../../core';
import { TenantService } from '../../../../services';
import { ChartPostlinkComponent, ConnectionComponent, FilteredSelectVendorComponent, FilteredSelectVendorMediaComponent } from '../../../../shared';
import { ChartTrafficComponent } from "../../../../shared/components/chart-traffic/chart-traffic.component";
import { ChartFinanceComponent } from "../../../../shared/components/chart-finance/chart-finance.component";

@Component({
  selector: 'carambola-vendorport-form',
  imports: [
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
    ConnectionComponent,
    FilteredSelectVendorComponent,
    FilteredSelectVendorMediaComponent,
    ChartPostlinkComponent,
    ChartTrafficComponent,
    ChartFinanceComponent,
  ],
  templateUrl: './vendorport-form.component.html',
  styleUrls: ['./vendorport-form.component.scss'],
})
export class VendorPortFormComponent implements AfterViewInit {
  private formBuilder = inject(UntypedFormBuilder);
  private snackBar = inject(MatSnackBar);
  private tenantService = inject(TenantService);
  private vendorAPI = inject(VendorAPI);
  private vendorMediaAPI = inject(VendorMediaAPI);
  private vendorPortAPI = inject(VendorPortAPI);

  PartnerType = PartnerType;
  PortType = PortType;

  formGroup: UntypedFormGroup;
  vendors: WritableSignal<Vendor[]> = signal([]);
  managedVendors: WritableSignal<Vendor[]> = signal([]);
  vendorMedias: WritableSignal<VendorMedia[]> = signal([]);
  managedVendorMedias: WritableSignal<VendorMedia[]> = signal([]);
  formVendorId: WritableSignal<number> = signal(0);

  initialized = false;

  isConnectionManager = false;
  isConnectionObserver = false;
  readonly = false;

  mode = input<PartnerType>(PartnerType.PARTNER_TYPE_DIRECT);
  tab = input<string>('property');
  vendorMediaId = input<number>(0);
  vendorPort = input<VendorPort | null>(null);
  changed = output<boolean>();

  vendorPortFull: VendorPort | null = null;
  connections: Connection[] = [];
  selectedIndex = 0;

  constructor() {
    this.formGroup = this.formBuilder.group({
      'vendor': [null, Validators.required],
      'vendorMedia': [null, Validators.required],
      'name': ['', Validators.required],
      'format': ['banner', Validators.required],
      'budget': ['unknown', Validators.required],
      'tagId': ['', null],
      'mode': [PortType.PORT_TYPE_SHARE, Validators.required],
      'timeout': [1000, null],
      'remark': ['', null],
    });

    effect(() => {
      const vendorPort = this.vendorPort();
      const vendorMediaId = this.vendorMediaId();
      const vendors = this.vendors();
      const vendorMedias = this.vendorMedias();
      const tab = this.tab();

      if (!this.initialized) {
        if (!vendorPort) {
          if (vendorMediaId > 0) {
            const vendorMedia = vendorMedias.find(vendorMedia => vendorMedia.id === vendorMediaId) ?? null;
            if (vendorMedia) {
              const vendor = vendors.find(vendor => vendor.id === vendorMedia.vendor.id) ?? null;
              if (vendor) {
                this.initialized = true;

                this.formVendorId.set(vendor.id!);
                this.managedVendorMedias.set(vendorMedias.filter(vendorMedia => vendorMedia.vendor.id === vendor.id));
                this.connections = [];

                this.formGroup.setControl('vendor', this.formBuilder.control({value: vendor, disabled: this.readonly}, Validators.required), {emitEvent: false});
                this.formGroup.setControl('vendorMedia', this.formBuilder.control({value: vendorMedia, disabled: this.readonly}, Validators.required), {emitEvent: false});
                const timestamp = Math.round(new Date().getTime() / 1000).toString(16).toUpperCase();
                this.formGroup.setControl('tagId', this.formBuilder.control({value: timestamp, disabled: true}, Validators.required), {emitEvent: false});

                if (this.mode() === PartnerType.PARTNER_TYPE_DIRECT) {
                  this.formGroup.setControl('mode', this.formBuilder.control({value: PortType.PORT_TYPE_DIRECT, disabled: true}, Validators.required), {emitEvent: false});
                }
                if (this.mode() === PartnerType.PARTNER_TYPE_PROGRAMMATIC) {
                  this.formGroup.setControl('mode', this.formBuilder.control({value: PortType.PORT_TYPE_SHARE, disabled: false}, Validators.required), {emitEvent: false});
                }
              }
            }
          } else {
            this.initialized = true;

            this.connections = [];

            this.formGroup.setControl('vendor', this.formBuilder.control(null, Validators.required), {emitEvent: false});
            this.formGroup.setControl('vendorMedia', this.formBuilder.control({value: null, disabled: true}, Validators.required), {emitEvent: false});
            const timestamp = Math.round(new Date().getTime() / 1000).toString(16).toUpperCase();
            this.formGroup.setControl('tagId', this.formBuilder.control({value: timestamp, disabled: true}, Validators.required), {emitEvent: false});

            if (this.mode() === PartnerType.PARTNER_TYPE_DIRECT) {
              this.formGroup.setControl('mode', this.formBuilder.control({value: PortType.PORT_TYPE_DIRECT, disabled: true}, Validators.required), {emitEvent: false});
            }
            if (this.mode() === PartnerType.PARTNER_TYPE_PROGRAMMATIC) {
              this.formGroup.setControl('mode', this.formBuilder.control({value: PortType.PORT_TYPE_SHARE, disabled: false}, Validators.required), {emitEvent: false});
            }
          }
        } else {
          this.vendorPortAPI.getVendorPort(this.vendorPort()!.id!).subscribe(vendorPort => {
            this.vendorPortFull = vendorPort;

            const vendor = vendors.find(vendor => vendor.id === vendorPort.vendor.id) ?? null;
            const vendorMedia = vendorMedias.find(vendorMedia => vendorMedia.id === vendorPort.vendorMedia.id) ?? null;
            if (vendor && vendorMedia) {
              this.readonly = !this.tenantService.isTenantManager() && !this.tenantService.isManager() && !this.tenantService.isVendorManager(vendor);
              this.isConnectionManager = this.tenantService.isTenantManager() || this.tenantService.isTenantOperator() || this.tenantService.isManager();
              this.isConnectionObserver = this.tenantService.isTenantManager() || this.tenantService.isTenantOperator() || this.tenantService.isTenantObserver() || this.tenantService.isManager();

              this.initialized = true;

              this.formVendorId.set(vendor.id!);
              this.managedVendorMedias.set(vendorMedias.filter(vendorMedia => vendorMedia.vendor.id === vendor.id));
              this.connections = vendorPort.connection.filter(connection => !connection.deleted).filter(connection => !connection.clientPort.deleted);
              this.selectedIndex = tab === 'property' ? 0 : tab === 'connection' ? 1 : tab === 'deeplink' ? 2 : tab === 'traffic' ? 3 : 4;

              this.formGroup.setControl('vendor', this.formBuilder.control({value: vendor, disabled: this.readonly}, Validators.required), {emitEvent: false});
              this.formGroup.setControl('vendorMedia', this.formBuilder.control({value: vendorMedia, disabled: this.readonly}, Validators.required), {emitEvent: false});
              this.formGroup.setControl('name', this.formBuilder.control({value: vendorPort.name, disabled: this.readonly}, Validators.required), {emitEvent: false});
              this.formGroup.setControl('format', this.formBuilder.control({value: vendorPort.format, disabled: this.readonly}, Validators.required), {emitEvent: false});
              this.formGroup.setControl('budget', this.formBuilder.control({value: vendorPort.budget, disabled: this.readonly}, Validators.required), {emitEvent: false});
              this.formGroup.setControl('tagId', this.formBuilder.control({value: vendorPort.tagId, disabled: true}, Validators.required), {emitEvent: false});
              this.formGroup.setControl('mode', this.formBuilder.control({value: vendorPort.mode, disabled: this.readonly}, Validators.required), {emitEvent: false});
              this.formGroup.setControl('timeout', this.formBuilder.control({value: vendorPort.timeout, disabled: this.readonly}, null), {emitEvent: false});
              this.formGroup.setControl('remark', this.formBuilder.control({value: vendorPort.remark, disabled: this.readonly}, null), {emitEvent: false});

              if (this.mode() === PartnerType.PARTNER_TYPE_DIRECT) {
                this.formGroup.setControl('mode', this.formBuilder.control({value: PortType.PORT_TYPE_DIRECT, disabled: true}, Validators.required), {emitEvent: false});
              }
              if (this.mode() === PartnerType.PARTNER_TYPE_PROGRAMMATIC) {
                this.formGroup.setControl('mode', this.formBuilder.control({value: vendorPort.mode, disabled: this.readonly}, Validators.required), {emitEvent: false});
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

      this.vendorAPI.getVendorList({
        filter: {
          mode: [String(this.mode())],
        },
        searchKey: [],
        searchValue: '',
      }).subscribe(data => {
        this.vendors.set(data.filter(vendor => !vendor.deleted));
        this.managedVendors.set(this.vendors());
      });
      this.vendorMediaAPI.getVendorMediaList({
        filter: {
          vendorMode: [String(this.mode())],
        },
        searchKey: [],
        searchValue: '',
      }).subscribe(data => {
        this.vendorMedias.set(data.filter(vendorMedia => !vendorMedia.deleted));
      });
    });
  }

  ngAfterViewInit() {
    this.formGroup.valueChanges.subscribe(data => {
      if (data.vendor !== null && data.vendor.id !== this.formVendorId()) {
        this.formVendorId.set(data.vendor.id);
        this.formGroup.setControl('vendorMedia', this.formBuilder.control(null, Validators.required), {emitEvent: false});

        if (this.tenantService.isTenantManager() || this.tenantService.isManager() || this.tenantService.isVendorManager(data.vendor)) {
          this.managedVendorMedias.set(this.vendorMedias().filter(vendorMedia => vendorMedia.vendor.id === data.vendor.id));
        }
      }
    });
  }

  addVendorPort() {
    if (!this.formGroup.valid) {
      this.formGroup.markAllAsTouched();
      return;
    }

    const vendorPort: VendorPort = {
      id: null,
      deleted: false,
      vendor: this.formGroup.value.vendor,
      vendorMedia: this.formGroup.value.vendorMedia,
      name: this.formGroup.value.name,
      format: this.formGroup.value.format,
      budget: this.formGroup.value.budget,
      tagId: this.formGroup.getRawValue().tagId,
      mode: this.formGroup.getRawValue().mode,
      timeout: this.formGroup.value.timeout,
      remark: this.formGroup.value.remark,
      createTime: null,
      updateTime: null,
      connection: [],
    };

    this.vendorPortAPI.addVendorPort(vendorPort).subscribe(() => {
      this.snackBar.open('下游广告位已创建', 'OK', {
        duration: 2000,
      });

      this.changed.emit(true);
    });
  }

  updateVendorPort() {
    if (!this.formGroup.valid) {
      this.formGroup.markAllAsTouched();
      return;
    }

    const vendorPort = this.vendorPort();
    if (!vendorPort) {
      return;
    }

    vendorPort.vendor = this.formGroup.value.vendor;
    vendorPort.vendorMedia = this.formGroup.value.vendorMedia;
    vendorPort.name = this.formGroup.value.name;
    vendorPort.format = this.formGroup.value.format;
    vendorPort.budget = this.formGroup.value.budget;
    vendorPort.tagId = this.formGroup.getRawValue().tagId;
    vendorPort.mode = this.formGroup.getRawValue().mode;
    vendorPort.timeout = this.formGroup.value.timeout;
    vendorPort.remark = this.formGroup.value.remark;

    this.vendorPortAPI.updateVendorPort(vendorPort.id!, vendorPort).subscribe(() => {
      this.snackBar.open('下游广告位已修改', 'OK', {
        duration: 2000,
      });

      this.changed.emit(true);
    });
  }

  removeVendorPort() {
    const vendorPort = this.vendorPort();

    if (vendorPort) {
      if (vendorPort.connection.filter(connection => !connection.deleted).length > 0) {
        this.snackBar.open('存在已配置的连接，不能删除广告位', undefined, {
          duration: 2000,
        });

        return;
      }

      this.vendorPortAPI.removeVendorPort(vendorPort.id!).subscribe(() => {
        this.snackBar.open('下游广告位已删除', 'OK', {
          duration: 2000,
        });

        this.changed.emit(true);
      });
    }
  }

  cancelVendorPort() {
    this.changed.emit(false);
  }

  connectionChanged() {
    this.vendorPortAPI.getVendorPort(this.vendorPort()!.id!).subscribe(vendorPort => {
      this.connections = vendorPort.connection.filter(connection => !connection.deleted).filter(connection => !connection.clientPort.deleted);
    });
  }

}
