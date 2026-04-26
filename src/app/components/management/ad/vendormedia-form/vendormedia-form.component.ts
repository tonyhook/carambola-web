import { ChangeDetectionStrategy, Component, effect, inject, input, OnInit, output, signal, WritableSignal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';

import { PartnerType, Vendor, VendorAPI, VendorMedia, VendorMediaAPI } from '../../../../core';
import { TenantService } from '../../../../services';
import { FilteredSelectVendorComponent } from '../../../../shared';

interface VendorMediaFormControls {
  vendor: FormControl<Vendor | null>;
  name: FormControl<string>;
  platform: FormControl<string>;
  apppackage: FormControl<string | null>;
  appversion: FormControl<string | null>;
  applink: FormControl<string | null>;
  remark: FormControl<string | null>;
}

@Component({
  selector: 'carambola-vendormedia-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSnackBarModule,
    MatTabsModule,
    FilteredSelectVendorComponent,
  ],
  templateUrl: './vendormedia-form.component.html',
  styleUrls: ['./vendormedia-form.component.scss'],
})
export class VendorMediaFormComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private tenantService = inject(TenantService);
  private vendorAPI = inject(VendorAPI);
  private vendorMediaAPI = inject(VendorMediaAPI);

  formGroup: FormGroup<VendorMediaFormControls>;
  vendors: WritableSignal<Vendor[]> = signal([]);
  managedVendors: WritableSignal<Vendor[]> = signal([]);

  initialized = false;

  readonly = false;

  mode = input<PartnerType>(PartnerType.PARTNER_TYPE_DIRECT);
  vendorId = input<number>(0);
  vendorMedia = input<VendorMedia | null>(null);
  changed = output<boolean>();

  constructor() {
    this.formGroup = this.formBuilder.group({
      vendor: this.formBuilder.control<Vendor | null>(null, Validators.required),
      name: this.formBuilder.nonNullable.control('', Validators.required),
      platform: this.formBuilder.nonNullable.control('Android', Validators.required),
      apppackage: this.formBuilder.control<string | null>(''),
      appversion: this.formBuilder.control<string | null>(''),
      applink: this.formBuilder.control<string | null>(''),
      remark: this.formBuilder.control<string | null>(''),
    });

    effect(() => {
      const vendorMedia = this.vendorMedia();
      const vendorId = this.vendorId();
      const vendors = this.vendors();

      if (!this.initialized) {
        if (!vendorMedia) {
          if (vendorId > 0) {
            const vendor = vendors.find(vendor => vendor.id === vendorId) ?? null;
            if (vendor) {
              this.initialized = true;

              this.formGroup.setControl('vendor', this.createVendorControl(vendor), {emitEvent: false});
            }
          } else {
            this.initialized = true;

            this.formGroup.setControl('vendor', this.createVendorControl(null, false), {emitEvent: false});
          }
        } else {
          const vendor = vendors.find(vendor => vendor.id === vendorMedia.vendor.id);
          if (vendor) {
            this.readonly = !this.tenantService.isTenantManager() && !this.tenantService.isManager() && !this.tenantService.isVendorManager(vendor);

            this.initialized = true;

            this.formGroup.setControl('vendor', this.createVendorControl(vendor), {emitEvent: false});
            this.formGroup.setControl('name', this.createRequiredTextControl(vendorMedia.name), {emitEvent: false});
            this.formGroup.setControl('platform', this.createRequiredTextControl(vendorMedia.platform), {emitEvent: false});
            this.formGroup.setControl('apppackage', this.createOptionalTextControl(vendorMedia.apppackage), {emitEvent: false});
            this.formGroup.setControl('appversion', this.createOptionalTextControl(vendorMedia.appversion), {emitEvent: false});
            this.formGroup.setControl('applink', this.createOptionalTextControl(vendorMedia.applink), {emitEvent: false});
            this.formGroup.setControl('remark', this.createOptionalTextControl(vendorMedia.remark), {emitEvent: false});
          }
        }
      }
    });
  }

  private createVendorControl(value: Vendor | null, disabled = this.readonly): FormControl<Vendor | null> {
    return this.formBuilder.control({value, disabled}, Validators.required);
  }

  private createRequiredTextControl(value: string, disabled = this.readonly): FormControl<string> {
    return this.formBuilder.nonNullable.control({value, disabled}, Validators.required);
  }

  private createOptionalTextControl(value: string | null, disabled = this.readonly): FormControl<string | null> {
    return this.formBuilder.control({value, disabled});
  }

  ngOnInit() {
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
  }

  addVendorMedia() {
    if (!this.formGroup.valid) {
      this.formGroup.markAllAsTouched();
      return;
    }

    const vendor = this.formGroup.controls.vendor.value;
    if (!vendor) {
      this.formGroup.markAllAsTouched();
      return;
    }

    const vendorMedia: VendorMedia = {
      id: null,
      deleted: false,
      vendor,
      name: this.formGroup.controls.name.value,
      platform: this.formGroup.controls.platform.value,
      apppackage: this.formGroup.controls.apppackage.value ?? '',
      appversion: this.formGroup.controls.appversion.value ?? '',
      applink: this.formGroup.controls.applink.value ?? '',
      remark: this.formGroup.controls.remark.value,
      createTime: null,
      updateTime: null,
    };

    this.vendorMediaAPI.addVendorMedia(vendorMedia).subscribe(() => {
      this.snackBar.open('下游媒体已创建', 'OK', {
        duration: 2000,
      });

      this.changed.emit(true);
    });
  }

  updateVendorMedia() {
    if (!this.formGroup.valid) {
      this.formGroup.markAllAsTouched();
      return;
    }

    const vendorMedia = this.vendorMedia();
    const vendor = this.formGroup.controls.vendor.value;
    if (!vendorMedia || !vendor) {
      return;
    }

    vendorMedia.vendor = vendor;
    vendorMedia.name = this.formGroup.controls.name.value;
    vendorMedia.platform = this.formGroup.controls.platform.value;
    vendorMedia.apppackage = this.formGroup.controls.apppackage.value ?? '';
    vendorMedia.appversion = this.formGroup.controls.appversion.value ?? '';
    vendorMedia.applink = this.formGroup.controls.applink.value ?? '';
    vendorMedia.remark = this.formGroup.controls.remark.value;

    this.vendorMediaAPI.updateVendorMedia(vendorMedia.id!, vendorMedia).subscribe(() => {
      this.snackBar.open('下游媒体已修改', 'OK', {
        duration: 2000,
      });

      this.changed.emit(true);
    });
}

  removeVendorMedia() {
    const vendorMedia = this.vendorMedia();
    if (vendorMedia) {
      this.vendorMediaAPI.removeVendorMedia(vendorMedia.id!).subscribe(() => {
        this.snackBar.open('下游媒体已删除', 'OK', {
          duration: 2000,
        });

        this.changed.emit(true);
      });
    }
  }

  cancelVendorMedia() {
    this.changed.emit(false);
  }

}
