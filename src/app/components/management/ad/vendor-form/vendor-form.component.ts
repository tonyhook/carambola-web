import { Component, effect, ElementRef, input, output, ViewChild, inject, signal, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { startWith } from 'rxjs';

import { PartnerType, ROLE_TENANT_DOWNSTREAM_MANAGER_DIRECT, ROLE_TENANT_DOWNSTREAM_MANAGER_PROGRAMMATIC, TenantAPI, TenantUser, User, UserAPI, Vendor, VendorAPI } from '../../../../core';
import { TenantService } from '../../../../services';

interface VendorFormControls {
  downstream: FormControl<TenantUser[]>;
  name: FormControl<string>;
  ekey: FormControl<string | null>;
  ikey: FormControl<string | null>;
  remark: FormControl<string | null>;
}

@Component({
  selector: 'carambola-vendor-form',
  imports: [
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSnackBarModule,
    MatTabsModule,
  ],
  templateUrl: './vendor-form.component.html',
  styleUrls: ['./vendor-form.component.scss'],
})
export class VendorFormComponent {
  private formBuilder = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private tenantService = inject(TenantService);
  private vendorAPI = inject(VendorAPI);
  private tenantAPI = inject(TenantAPI);
  private userAPI = inject(UserAPI);

  PartnerType = PartnerType;

  formGroup: FormGroup<VendorFormControls>;
  separatorKeysCodes: number[] = [ENTER, COMMA];
  readonly allUsers = signal<User[]>([]);
  ctrlDownstream = new FormControl<string | null>(null);
  readonly downstreamFilter = toSignal(this.ctrlDownstream.valueChanges.pipe(startWith(null)), {initialValue: null});
  readonly filteredDownstream = computed(() => {
    const username = this.downstreamFilter();
    const allUsers = this.allUsers();

    return username ? this._filter(username) : allUsers.slice();
  });
  @ViewChild('inputDownstream') inputDownstream: ElementRef<HTMLInputElement> | undefined;

  readonly = false;

  mode = input<PartnerType>(PartnerType.PARTNER_TYPE_DIRECT);
  vendor = input<Vendor | null>(null);
  changed = output<boolean>();

  constructor() {
    this.formGroup = this.formBuilder.group({
      downstream: this.formBuilder.nonNullable.control<TenantUser[]>([]),
      name: this.formBuilder.nonNullable.control('', Validators.required),
      ekey: this.formBuilder.control<string | null>({value: '', disabled: true}, Validators.required),
      ikey: this.formBuilder.control<string | null>({value: '', disabled: true}, Validators.required),
      remark: this.formBuilder.control<string | null>(''),
    });

    effect(() => {
      const vendor = this.vendor();
      const mode = this.mode();

      if (!vendor) {
        this.formGroup.setControl('downstream', this.createDownstreamControl([]), {emitEvent: false});
        this.formGroup.setControl('name', this.createRequiredTextControl(''), {emitEvent: false});
        this.formGroup.setControl('ekey', this.createKeyControl(''), {emitEvent: false});
        this.formGroup.setControl('ikey', this.createKeyControl(''), {emitEvent: false});
        this.formGroup.setControl('remark', this.createOptionalTextControl(''), {emitEvent: false});
      } else {
        const tenant = this.tenantService.tenant();

        this.readonly = !this.tenantService.isTenantManager() && !this.tenantService.isManager();

        if (!this.readonly) {
          this.userAPI.getUserList().subscribe(data => {
            this.allUsers.set(data);
          });
        }

        const downstream: TenantUser[] = [];
        if (tenant && tenant.user) {
          for (const user of tenant.user) {
            if ((user.role === ROLE_TENANT_DOWNSTREAM_MANAGER_DIRECT || user.role === ROLE_TENANT_DOWNSTREAM_MANAGER_PROGRAMMATIC) && user.resource === vendor.id) {
              downstream.push(user);
            }
          }
        }

        this.formGroup.setControl('downstream', this.createDownstreamControl(downstream), {emitEvent: false});
        this.formGroup.setControl('name', this.createRequiredTextControl(vendor.name), {emitEvent: false});
        this.formGroup.setControl('ekey', this.createKeyControl(vendor.ekey, mode !== PartnerType.PARTNER_TYPE_DIRECT), {emitEvent: false});
        this.formGroup.setControl('ikey', this.createKeyControl(vendor.ikey, mode !== PartnerType.PARTNER_TYPE_DIRECT), {emitEvent: false});
        this.formGroup.setControl('remark', this.createOptionalTextControl(vendor.remark), {emitEvent: false});
      }
    });
  }

  get downstreamUsers(): TenantUser[] {
    return this.formGroup.controls.downstream.value;
  }

  private createDownstreamControl(value: TenantUser[], disabled = this.readonly): FormControl<TenantUser[]> {
    return this.formBuilder.nonNullable.control({value, disabled});
  }

  private createRequiredTextControl(value: string, disabled = this.readonly): FormControl<string> {
    return this.formBuilder.nonNullable.control({value, disabled}, Validators.required);
  }

  private createKeyControl(value: string | null, required = true): FormControl<string | null> {
    return required
      ? this.formBuilder.control({value, disabled: true}, Validators.required)
      : this.formBuilder.control({value, disabled: true});
  }

  private createOptionalTextControl(value: string | null, disabled = this.readonly): FormControl<string | null> {
    return this.formBuilder.control({value, disabled});
  }

  private _filter(value: string): User[] {
    const filterValue = value.toLowerCase();

    return this.allUsers().filter(user => user.username.toLowerCase().includes(filterValue));
  }

  add(event: MatChipInputEvent, control: FormControl<string | null> | null, users: TenantUser[]): void {
    const value = event.value?.trim();

    if (value && users.map(user => user.username).indexOf(value) < 0) {
      users.push({id: null, username: value, role: this.mode() === PartnerType.PARTNER_TYPE_DIRECT ? ROLE_TENANT_DOWNSTREAM_MANAGER_DIRECT : ROLE_TENANT_DOWNSTREAM_MANAGER_PROGRAMMATIC, resource: null});
    }

    if (event.chipInput) {
      event.chipInput.clear();
    }

    if (control) {
      control.setValue(null);
    }
  }

  remove(user: TenantUser, control: FormControl<string | null> | null, users: TenantUser[]): void {
    const index = users.map(user => user.username).indexOf(user.username);

    if (index >= 0) {
      users.splice(index, 1);
    }

    if (control) {
      control.setValue(null);
    }
  }

  select(event: MatAutocompleteSelectedEvent, input: HTMLInputElement, control: FormControl<string | null>, users: TenantUser[]): void {
    const value = event.option.value as string;

    if (users.map(user => user.username).indexOf(value) < 0) {
      users.push({id: null, username: value, role: this.mode() === PartnerType.PARTNER_TYPE_DIRECT ? ROLE_TENANT_DOWNSTREAM_MANAGER_DIRECT : ROLE_TENANT_DOWNSTREAM_MANAGER_PROGRAMMATIC, resource: null});
    }

    input.value = '';
    control.setValue(null);
    event.option.deselect();
  }

  addVendor() {
    if (!this.formGroup.valid) {
      this.formGroup.markAllAsTouched();
      return;
    }

    const vendor: Vendor = {
      id: null,
      deleted: false,
      tenant: this.tenantService.tenant()!,
      name: this.formGroup.controls.name.value,
      mode: this.mode(),
      ekey: null,
      ikey: null,
      remark: this.formGroup.controls.remark.value,
      createTime: null,
      updateTime: null,
    };

    this.vendorAPI.addVendor(vendor).subscribe((vendor) => {
      const tenant = this.tenantService.tenant()!;
      const downstream = this.formGroup.controls.downstream.value;
      if (downstream.length > 0) {
        for (const user of downstream) {
          tenant.user.push({id: null, username: user.username, role: this.mode() === PartnerType.PARTNER_TYPE_DIRECT ? ROLE_TENANT_DOWNSTREAM_MANAGER_DIRECT : ROLE_TENANT_DOWNSTREAM_MANAGER_PROGRAMMATIC, resource: vendor.id});
        }
        this.tenantAPI.updateTenant(tenant.id!, tenant).subscribe();
      }

      this.snackBar.open('流量主已创建', 'OK', {
        duration: 2000,
      });

      this.changed.emit(true);
    });
  }

  updateVendor() {
    if (!this.formGroup.valid) {
      this.formGroup.markAllAsTouched();
      return;
    }

    const vendor = this.vendor();
    if (!vendor) {
      return;
    }

    vendor.tenant = this.tenantService.tenant()!;
    vendor.name = this.formGroup.controls.name.value;
    vendor.ekey = this.formGroup.controls.ekey.getRawValue();
    vendor.ikey = this.formGroup.controls.ikey.getRawValue();
    vendor.remark = this.formGroup.controls.remark.value;

    this.vendorAPI.updateVendor(vendor.id!, vendor).subscribe(() => {
      const tenant = this.tenantService.tenant()!;
      const downstream = this.formGroup.controls.downstream.value;
      if (downstream.length >= 0) {
        const observers: TenantUser[] = [];
        let usersToBeChecked = tenant.user.filter(user => user.role === (this.mode() === PartnerType.PARTNER_TYPE_DIRECT ? ROLE_TENANT_DOWNSTREAM_MANAGER_DIRECT : ROLE_TENANT_DOWNSTREAM_MANAGER_PROGRAMMATIC) && user.resource === vendor.id);
        let changed = false;

        for (const user of downstream) {
          if (usersToBeChecked.filter(u => u.username === user.username).length > 0) {
            usersToBeChecked = usersToBeChecked.filter(u => u.username !== user.username);
          } else {
            changed = true;
          }
          observers.push({id: null, username: user.username, role: this.mode() === PartnerType.PARTNER_TYPE_DIRECT ? ROLE_TENANT_DOWNSTREAM_MANAGER_DIRECT : ROLE_TENANT_DOWNSTREAM_MANAGER_PROGRAMMATIC, resource: vendor.id});
        }

        if (usersToBeChecked.length > 0) {
          changed = true;
        }

        if (changed) {
          tenant.user = tenant.user.filter(user => user.role !== (this.mode() === PartnerType.PARTNER_TYPE_DIRECT ? ROLE_TENANT_DOWNSTREAM_MANAGER_DIRECT : ROLE_TENANT_DOWNSTREAM_MANAGER_PROGRAMMATIC) || user.resource !== vendor.id);
          tenant.user.push(...observers);
          this.tenantAPI.updateTenant(tenant.id!, tenant).subscribe();
        }
      }

      this.snackBar.open('流量主已修改', 'OK', {
        duration: 2000,
      });

      this.changed.emit(true);
    });
}

  removeVendor() {
    const vendor = this.vendor();
    if (vendor) {
      this.vendorAPI.removeVendor(vendor.id!).subscribe(() => {
        this.snackBar.open('流量主已删除', 'OK', {
          duration: 2000,
        });

        this.changed.emit(true);
      });
    }
  }

  cancelVendor() {
    this.changed.emit(false);
  }

}
