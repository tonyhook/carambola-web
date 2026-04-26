import { AfterViewInit, ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, output, signal, WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { buildPortNameTemplate, ChartPostlinkComponent, ConnectionComponent, FilteredSelectVendorComponent, FilteredSelectVendorMediaComponent } from '../../../../shared';
import { ChartFinanceComponent } from "../../../../shared/components/chart-finance/chart-finance.component";
import { ChartTrafficComponent } from "../../../../shared/components/chart-traffic/chart-traffic.component";

interface VendorPortFormControls {
  vendor: FormControl<Vendor | null>;
  vendorMedia: FormControl<VendorMedia | null>;
  name: FormControl<string>;
  format: FormControl<string>;
  budget: FormControl<string>;
  tagId: FormControl<string>;
  mode: FormControl<number>;
  timeout: FormControl<number | null>;
  remark: FormControl<string | null>;
}

@Component({
  selector: 'carambola-vendorport-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  private destroyRef = inject(DestroyRef);
  private formBuilder = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private tenantService = inject(TenantService);
  private vendorAPI = inject(VendorAPI);
  private vendorMediaAPI = inject(VendorMediaAPI);
  private vendorPortAPI = inject(VendorPortAPI);

  PartnerType = PartnerType;
  PortType = PortType;

  formGroup: FormGroup<VendorPortFormControls>;
  vendors: WritableSignal<Vendor[]> = signal([]);
  managedVendors: WritableSignal<Vendor[]> = signal([]);
  vendorMedias: WritableSignal<VendorMedia[]> = signal([]);
  managedVendorMedias: WritableSignal<VendorMedia[]> = signal([]);
  formVendorId: WritableSignal<number> = signal(0);

  initialized = false;
  autoNameManaged = true;
  lastGeneratedName = '';
  syncingAutoName = false;

  isConnectionManager = false;
  isConnectionObserver = false;
  readonly = false;

  mode = input<PartnerType>(PartnerType.PARTNER_TYPE_DIRECT);
  tab = input<string>('property');
  vendorMediaId = input<number>(0);
  vendorPort = input<VendorPort | null>(null);
  changed = output<boolean>();

  vendorPortFull = signal<VendorPort | null>(null);
  connections = signal<Connection[]>([]);
  selectedIndex = signal(0);

  constructor() {
    this.formGroup = this.formBuilder.group({
      vendor: this.formBuilder.control<Vendor | null>(null, Validators.required),
      vendorMedia: this.formBuilder.control<VendorMedia | null>(null, Validators.required),
      name: this.formBuilder.nonNullable.control('', Validators.required),
      format: this.formBuilder.nonNullable.control('banner', Validators.required),
      budget: this.formBuilder.nonNullable.control('unknown', Validators.required),
      tagId: this.formBuilder.nonNullable.control(''),
      mode: this.formBuilder.nonNullable.control(PortType.PORT_TYPE_SHARE, Validators.required),
      timeout: this.formBuilder.control<number | null>(1000, Validators.required),
      remark: this.formBuilder.control<string | null>(''),
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
                this.connections.set([]);

                this.formGroup.setControl('vendor', this.createVendorControl(vendor), {emitEvent: false});
                this.formGroup.setControl('vendorMedia', this.createVendorMediaControl(vendorMedia), {emitEvent: false});
                const timestamp = Math.round(new Date().getTime() / 1000).toString(16).toUpperCase();
                this.formGroup.setControl('tagId', this.createTagIdControl(timestamp), {emitEvent: false});

                if (this.mode() === PartnerType.PARTNER_TYPE_DIRECT) {
                  this.formGroup.setControl('mode', this.createModeControl(PortType.PORT_TYPE_DIRECT, true), {emitEvent: false});
                }
                if (this.mode() === PartnerType.PARTNER_TYPE_PROGRAMMATIC) {
                  this.formGroup.setControl('mode', this.createModeControl(PortType.PORT_TYPE_SHARE, false), {emitEvent: false});
                }

                this.initializeAutoName(null);
              }
            }
          } else {
            this.initialized = true;

            this.connections.set([]);

            this.formGroup.setControl('vendor', this.createVendorControl(null, false), {emitEvent: false});
            this.formGroup.setControl('vendorMedia', this.createVendorMediaControl(null, true), {emitEvent: false});
            const timestamp = Math.round(new Date().getTime() / 1000).toString(16).toUpperCase();
            this.formGroup.setControl('tagId', this.createTagIdControl(timestamp), {emitEvent: false});

            if (this.mode() === PartnerType.PARTNER_TYPE_DIRECT) {
              this.formGroup.setControl('mode', this.createModeControl(PortType.PORT_TYPE_DIRECT, true), {emitEvent: false});
            }
            if (this.mode() === PartnerType.PARTNER_TYPE_PROGRAMMATIC) {
              this.formGroup.setControl('mode', this.createModeControl(PortType.PORT_TYPE_SHARE, false), {emitEvent: false});
            }

            this.initializeAutoName(null);
          }
        } else {
          this.vendorPortAPI.getVendorPort(this.vendorPort()!.id!).subscribe(vendorPort => {
            this.vendorPortFull.set(vendorPort);

            const vendor = vendors.find(vendor => vendor.id === vendorPort.vendor.id) ?? null;
            const vendorMedia = vendorMedias.find(vendorMedia => vendorMedia.id === vendorPort.vendorMedia.id) ?? null;
            if (vendor && vendorMedia) {
              this.readonly = !this.tenantService.isTenantManager() && !this.tenantService.isManager() && !this.tenantService.isVendorManager(vendor);
              this.isConnectionManager = this.tenantService.isTenantManager() || this.tenantService.isTenantOperator() || this.tenantService.isManager();
              this.isConnectionObserver = this.tenantService.isTenantManager() || this.tenantService.isTenantOperator() || this.tenantService.isTenantObserver() || this.tenantService.isManager();

              this.initialized = true;

              this.formVendorId.set(vendor.id!);
              this.managedVendorMedias.set(vendorMedias.filter(vendorMedia => vendorMedia.vendor.id === vendor.id));
              this.connections.set(vendorPort.connection.filter(connection => !connection.deleted).filter(connection => !connection.clientPort.deleted));
              this.selectedIndex.set(tab === 'property' ? 0 : tab === 'connection' ? 1 : tab === 'deeplink' ? 2 : tab === 'traffic' ? 3 : 4);

              this.formGroup.setControl('vendor', this.createVendorControl(vendor), {emitEvent: false});
              this.formGroup.setControl('vendorMedia', this.createVendorMediaControl(vendorMedia), {emitEvent: false});
              this.formGroup.setControl('name', this.createRequiredTextControl(vendorPort.name), {emitEvent: false});
              this.formGroup.setControl('format', this.createRequiredTextControl(vendorPort.format), {emitEvent: false});
              this.formGroup.setControl('budget', this.createRequiredTextControl(vendorPort.budget), {emitEvent: false});
              this.formGroup.setControl('tagId', this.createTagIdControl(vendorPort.tagId), {emitEvent: false});
              this.formGroup.setControl('mode', this.createModeControl(vendorPort.mode), {emitEvent: false});
              this.formGroup.setControl('timeout', this.createTimeoutControl(vendorPort.timeout), {emitEvent: false});
              this.formGroup.setControl('remark', this.createOptionalTextControl(vendorPort.remark), {emitEvent: false});

              if (this.mode() === PartnerType.PARTNER_TYPE_DIRECT) {
                this.formGroup.setControl('mode', this.createModeControl(PortType.PORT_TYPE_DIRECT, true), {emitEvent: false});
              }
              if (this.mode() === PartnerType.PARTNER_TYPE_PROGRAMMATIC) {
                this.formGroup.setControl('mode', this.createModeControl(vendorPort.mode), {emitEvent: false});
              }

              this.initializeAutoName(vendorPort.name);
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
    this.formGroup.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(data => {
      const vendor = data.vendor;

      if (vendor && vendor.id !== null && vendor.id !== this.formVendorId()) {
        this.formVendorId.set(vendor.id);
        this.formGroup.setControl('vendorMedia', this.createVendorMediaControl(null, false), {emitEvent: false});

        if (this.tenantService.isTenantManager() || this.tenantService.isManager() || this.tenantService.isVendorManager(vendor)) {
          this.managedVendorMedias.set(this.vendorMedias().filter(vendorMedia => vendorMedia.vendor.id === vendor.id));
        }

        this.syncAutoName();
      }

      this.syncAutoName();
    });

    this.formGroup.controls.name.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(name => {
      if (this.syncingAutoName || !this.autoNameManaged) {
        return;
      }

      if ((name ?? '') !== this.lastGeneratedName) {
        this.autoNameManaged = false;
      }
    });
  }

  private createVendorControl(value: Vendor | null, disabled = this.readonly): FormControl<Vendor | null> {
    return this.formBuilder.control({value, disabled}, Validators.required);
  }

  private createVendorMediaControl(value: VendorMedia | null, disabled = this.readonly): FormControl<VendorMedia | null> {
    return this.formBuilder.control({value, disabled}, Validators.required);
  }

  private createRequiredTextControl(value: string, disabled = this.readonly): FormControl<string> {
    return this.formBuilder.nonNullable.control({value, disabled}, Validators.required);
  }

  private createOptionalTextControl(value: string | null, disabled = this.readonly): FormControl<string | null> {
    return this.formBuilder.control({value, disabled});
  }

  private createTagIdControl(value: string): FormControl<string> {
    return this.formBuilder.nonNullable.control({value, disabled: true}, Validators.required);
  }

  private createModeControl(value: number, disabled = this.readonly): FormControl<number> {
    return this.formBuilder.nonNullable.control({value, disabled}, Validators.required);
  }

  private createTimeoutControl(value: number | null, disabled = this.readonly): FormControl<number | null> {
    return this.formBuilder.control({value, disabled}, Validators.required);
  }

  private buildAutoName(): string {
    const vendorMedia = this.formGroup.controls.vendorMedia.value;

    return buildPortNameTemplate({
      mediaName: vendorMedia?.name,
      platform: vendorMedia?.platform,
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

  addVendorPort() {
    if (!this.formGroup.valid) {
      this.formGroup.markAllAsTouched();
      return;
    }

    const vendor = this.formGroup.controls.vendor.value;
    const vendorMedia = this.formGroup.controls.vendorMedia.value;
    if (!vendor || !vendorMedia) {
      this.formGroup.markAllAsTouched();
      return;
    }

    const vendorPort: VendorPort = {
      id: null,
      deleted: false,
      vendor,
      vendorMedia,
      name: this.formGroup.controls.name.value,
      format: this.formGroup.controls.format.value,
      budget: this.formGroup.controls.budget.value,
      tagId: this.formGroup.controls.tagId.getRawValue(),
      mode: this.formGroup.controls.mode.getRawValue(),
      timeout: this.formGroup.controls.timeout.value!,
      remark: this.formGroup.controls.remark.value,
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
    const vendor = this.formGroup.controls.vendor.value;
    const vendorMedia = this.formGroup.controls.vendorMedia.value;
    if (!vendorPort || !vendor || !vendorMedia) {
      return;
    }

    vendorPort.vendor = vendor;
    vendorPort.vendorMedia = vendorMedia;
    vendorPort.name = this.formGroup.controls.name.value;
    vendorPort.format = this.formGroup.controls.format.value;
    vendorPort.budget = this.formGroup.controls.budget.value;
    vendorPort.tagId = this.formGroup.controls.tagId.getRawValue();
    vendorPort.mode = this.formGroup.controls.mode.getRawValue();
    vendorPort.timeout = this.formGroup.controls.timeout.value!;
    vendorPort.remark = this.formGroup.controls.remark.value;

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
      this.connections.set(vendorPort.connection.filter(connection => !connection.deleted).filter(connection => !connection.clientPort.deleted));
    });
  }

}
