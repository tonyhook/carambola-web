import { Component, effect, input, OnInit, output, signal, WritableSignal, inject } from '@angular/core';
import { UntypedFormGroup, UntypedFormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
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

@Component({
  selector: 'carambola-vendormedia-form',
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
  private formBuilder = inject(UntypedFormBuilder);
  private snackBar = inject(MatSnackBar);
  private tenantService = inject(TenantService);
  private vendorAPI = inject(VendorAPI);
  private vendorMediaAPI = inject(VendorMediaAPI);

  formGroup: UntypedFormGroup;
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
      'vendor': [null, Validators.required],
      'name': ['', Validators.required],
      'platform': ['Android', Validators.required],
      'apppackage': ['', null],
      'appversion': ['', null],
      'applink': ['', null],
      'remark': ['', null],
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

              this.formGroup.setControl('vendor', this.formBuilder.control({value: vendor, disabled: this.readonly}, Validators.required), {emitEvent: false});
            }
          } else {
            this.initialized = true;

            this.formGroup.setControl('vendor', this.formBuilder.control(null, Validators.required), {emitEvent: false});
          }
        } else {
          const vendor = vendors.find(vendor => vendor.id === vendorMedia.vendor.id);
          if (vendor) {
            this.readonly = !this.tenantService.isTenantManager() && !this.tenantService.isManager() && !this.tenantService.isVendorManager(vendor);

            this.initialized = true;

            this.formGroup.setControl('vendor', this.formBuilder.control({value: vendor, disabled: this.readonly}, Validators.required), {emitEvent: false});
            this.formGroup.setControl('name', this.formBuilder.control({value: vendorMedia.name, disabled: this.readonly}, Validators.required), {emitEvent: false});
            this.formGroup.setControl('platform', this.formBuilder.control({value: vendorMedia.platform, disabled: this.readonly}, Validators.required), {emitEvent: false});
            this.formGroup.setControl('apppackage', this.formBuilder.control({value: vendorMedia.apppackage, disabled: this.readonly}, null), {emitEvent: false});
            this.formGroup.setControl('appversion', this.formBuilder.control({value: vendorMedia.appversion, disabled: this.readonly}, null), {emitEvent: false});
            this.formGroup.setControl('applink', this.formBuilder.control({value: vendorMedia.applink, disabled: this.readonly}, null), {emitEvent: false});
            this.formGroup.setControl('remark', this.formBuilder.control({value: vendorMedia.remark, disabled: this.readonly}, null), {emitEvent: false});
          }
        }
      }
    });
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

    const vendorMedia: VendorMedia = {
      id: null,
      deleted: false,
      vendor: this.formGroup.value.vendor,
      name: this.formGroup.value.name,
      platform: this.formGroup.value.platform,
      apppackage: this.formGroup.value.apppackage,
      appversion: this.formGroup.value.appversion,
      applink: this.formGroup.value.applink,
      remark: this.formGroup.value.remark,
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
    if (!vendorMedia) {
      return;
    }

    vendorMedia.vendor = this.formGroup.value.vendor;
    vendorMedia.name = this.formGroup.value.name;
    vendorMedia.platform = this.formGroup.value.platform;
    vendorMedia.apppackage = this.formGroup.value.apppackage;
    vendorMedia.appversion = this.formGroup.value.appversion;
    vendorMedia.applink = this.formGroup.value.applink;
    vendorMedia.remark = this.formGroup.value.remark;

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
