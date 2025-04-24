import { Component, effect, ElementRef, input, output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UntypedFormGroup, UntypedFormBuilder, Validators, ReactiveFormsModule, FormControl } from '@angular/forms';
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
import { map, Observable, startWith } from 'rxjs';

import { PartnerType, ROLE_TENANT_DOWNSTREAM_MANAGER_DIRECT, ROLE_TENANT_DOWNSTREAM_MANAGER_PROGRAMMATIC, TenantAPI, TenantUser, User, UserAPI, Vendor, VendorAPI } from '../../../../core';
import { TenantService } from '../../../../services';

@Component({
  selector: 'carambola-vendor-form',
  imports: [
    CommonModule,
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
  PartnerType = PartnerType;

  formGroup: UntypedFormGroup;
  separatorKeysCodes: number[] = [ENTER, COMMA];
  allUsers: User[] = [];
  ctrlDownstream = new FormControl(null);
  filteredDownstream: Observable<User[]> = new Observable<User[]>();
  @ViewChild('inputDownstream') inputDownstream: ElementRef<HTMLInputElement> | undefined;

  readonly = false;

  mode = input<PartnerType>(PartnerType.PARTNER_TYPE_DIRECT);
  vendor = input<Vendor | null>(null);
  changed = output<boolean>();

  constructor(
    private formBuilder: UntypedFormBuilder,
    private snackBar: MatSnackBar,
    private tenantService: TenantService,
    private vendorAPI: VendorAPI,
    private tenantAPI: TenantAPI,
    private userAPI: UserAPI,
  ) {
    this.formGroup = this.formBuilder.group({
      'downstream': [[], null],
      'name': ['', Validators.required],
      'ekey': [{value: '', disabled: true}, Validators.required],
      'ikey': [{value: '', disabled: true}, Validators.required],
      'remark': ['', null],
    });

    effect(() => {
      const vendor = this.vendor();
      const mode = this.mode();

      if (!vendor) {
        this.formGroup.setControl('downstream', this.formBuilder.control([], null), {emitEvent: false});
        this.formGroup.setControl('name', this.formBuilder.control('', Validators.required), {emitEvent: false});
        this.formGroup.setControl('ekey', this.formBuilder.control({value: '', disabled: true}, Validators.required), {emitEvent: false});
        this.formGroup.setControl('ikey', this.formBuilder.control({value: '', disabled: true}, Validators.required), {emitEvent: false});
        this.formGroup.setControl('remark', this.formBuilder.control('', null), {emitEvent: false});
      } else {
        const tenant = this.tenantService.tenant();

        this.readonly = !this.tenantService.isTenantManager() && !this.tenantService.isManager();

        if (!this.readonly) {
          this.userAPI.getUserList().subscribe(data => {
            this.allUsers = data;
            this.filteredDownstream = this.ctrlDownstream.valueChanges.pipe(
              startWith(null),
              map((username: string | null) => (username ? this._filter(username) : this.allUsers.slice())),
            );
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

        this.formGroup.setControl('downstream', this.formBuilder.control({value: downstream, disabled: this.readonly}, null), {emitEvent: false});
        this.formGroup.setControl('name', this.formBuilder.control({value: vendor.name, disabled: this.readonly}, Validators.required), {emitEvent: false});
        this.formGroup.setControl('ekey', this.formBuilder.control({value: vendor.ekey, disabled: true}, mode === PartnerType.PARTNER_TYPE_DIRECT ? null : Validators.required), {emitEvent: false});
        this.formGroup.setControl('ikey', this.formBuilder.control({value: vendor.ikey, disabled: true}, mode === PartnerType.PARTNER_TYPE_DIRECT ? null : Validators.required), {emitEvent: false});
        this.formGroup.setControl('remark', this.formBuilder.control({value: vendor.remark, disabled: this.readonly}, null), {emitEvent: false});
      }
    });
  }

  private _filter(value: string): User[] {
    const filterValue = value.toLowerCase();

    return this.allUsers.filter(user => user.username.toLowerCase().includes(filterValue));
  }

  add(event: MatChipInputEvent, control: FormControl | null, users: TenantUser[]): void {
    const value = event.value;

    if (users.map(user => user.username).indexOf(value) < 0) {
      users.push({id: null, username: value, role: this.mode() === PartnerType.PARTNER_TYPE_DIRECT ? ROLE_TENANT_DOWNSTREAM_MANAGER_DIRECT : ROLE_TENANT_DOWNSTREAM_MANAGER_PROGRAMMATIC, resource: null});
    }

    if (event.chipInput) {
      event.chipInput.clear();
    }

    if (control) {
      control.setValue(null);
    }
  }

  remove(user: TenantUser, control: FormControl | null, users: TenantUser[]): void {
    const index = users.map(user => user.username).indexOf(user.username);

    if (index >= 0) {
      users.splice(index, 1);
    }

    if (control) {
      control.setValue(null);
    }
  }

  select(event: MatAutocompleteSelectedEvent, input: HTMLInputElement, control: FormControl, users: TenantUser[]): void {
    const value = event.option.value;

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
      name: this.formGroup.value.name,
      mode: this.mode(),
      ekey: null,
      ikey: null,
      remark: this.formGroup.value.remark,
      createTime: null,
      updateTime: null,
    };

    this.vendorAPI.addVendor(vendor).subscribe((vendor) => {
      const tenant = this.tenantService.tenant()!;
      if (this.formGroup.value.downstream.length > 0) {
        for (const user of this.formGroup.value.downstream) {
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
    vendor.name = this.formGroup.value.name;
    vendor.ekey = this.formGroup.getRawValue().ekey;
    vendor.ikey = this.formGroup.getRawValue().ikey;
    vendor.remark = this.formGroup.value.remark;

    this.vendorAPI.updateVendor(vendor.id!, vendor).subscribe(() => {
      const tenant = this.tenantService.tenant()!;
      if (this.formGroup.value.downstream.length >= 0) {
        const observers: TenantUser[] = [];
        let usersToBeChecked = tenant.user.filter(user => user.role === (this.mode() === PartnerType.PARTNER_TYPE_DIRECT ? ROLE_TENANT_DOWNSTREAM_MANAGER_DIRECT : ROLE_TENANT_DOWNSTREAM_MANAGER_PROGRAMMATIC) && user.resource === vendor.id);
        let changed = false;

        for (const user of this.formGroup.value.downstream) {
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
