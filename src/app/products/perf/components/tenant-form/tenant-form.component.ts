import { Component, computed, effect, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { startWith } from 'rxjs';

import { User, UserAPI } from '../../../../core';
import { ROLE_TENANT_MANAGER, Tenant, TenantAPI, TenantUser } from '../..';
import { TenantService } from '../..';

interface TenantFormControls {
  name: FormControl<string>;
  manager: FormControl<TenantUser[]>;
  enabled: FormControl<boolean>;
}

@Component({
  selector: 'carambola-perf-tenant-form',
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
    MatTabsModule,
  ],
  templateUrl: './tenant-form.component.html',
  styleUrls: ['./tenant-form.component.scss'],
})
export class TenantFormComponent {
  private formBuilder = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  tenantService = inject(TenantService);
  private tenantAPI = inject(TenantAPI);
  private userAPI = inject(UserAPI);

  formGroup: FormGroup<TenantFormControls>;
  separatorKeysCodes: number[] = [ENTER, COMMA];
  readonly allUsers = signal<User[]>([]);
  ctrlManager = new FormControl<string | null>(null);
  readonly managerFilter = toSignal(this.ctrlManager.valueChanges.pipe(startWith(null)), {initialValue: null});
  readonly filteredManager = computed(() => {
    const username = this.managerFilter();
    const allUsers = this.allUsers();

    return username ? this._filter(username) : allUsers.slice();
  });
  readonly inputManager = viewChild<ElementRef<HTMLInputElement>>('inputManager');

  readonly = false;

  tenant = input<Tenant | null>(null);
  changed = output<boolean>();

  constructor() {
    this.formGroup = this.formBuilder.group({
      name: this.formBuilder.nonNullable.control('', Validators.required),
      manager: this.formBuilder.nonNullable.control<TenantUser[]>([], Validators.required),
      enabled: this.formBuilder.nonNullable.control(true, Validators.required),
    });

    effect(() => {
      const tenant = this.tenant();

      if (!tenant) {
        return;
      }

      this.readonly = !this.tenantService.isManager();

      const managers: TenantUser[] = [];
      if (tenant.user) {
        for (const user of tenant.user) {
          if (user.role === ROLE_TENANT_MANAGER) {
            managers.push(user);
          }
        }
      }

      this.formGroup.setControl('name', this.createRequiredTextControl(tenant.name), {emitEvent: false});
      this.formGroup.setControl('manager', this.createTenantUsersControl(managers, this.readonly, true), {emitEvent: false});
      this.formGroup.setControl('enabled', this.createEnabledControl(tenant.enabled), {emitEvent: false});
    });

    this.userAPI.getUserList().subscribe(data => {
      this.allUsers.set(data);
    });
  }

  get managerUsers(): TenantUser[] {
    return this.formGroup.controls.manager.value;
  }

  private createRequiredTextControl(value: string, disabled = this.readonly): FormControl<string> {
    return this.formBuilder.nonNullable.control({value, disabled}, Validators.required);
  }

  private createTenantUsersControl(value: TenantUser[], disabled = this.readonly, required = false): FormControl<TenantUser[]> {
    return required
      ? this.formBuilder.nonNullable.control({value, disabled}, Validators.required)
      : this.formBuilder.nonNullable.control({value, disabled});
  }

  private createEnabledControl(value: boolean, disabled = this.readonly): FormControl<boolean> {
    return this.formBuilder.nonNullable.control({value, disabled}, Validators.required);
  }

  private _filter(value: string): User[] {
    const filterValue = value.toLowerCase();

    return this.allUsers().filter(user => user.username.toLowerCase().includes(filterValue));
  }

  add(event: MatChipInputEvent, control: FormControl<string | null> | null, users: TenantUser[]): void {
    const value = event.value?.trim();

    if (value && users.map(user => user.username).indexOf(value) < 0) {
      users.push({id: null, username: value, role: 0, resource: null});
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
      users.push({id: null, username: value, role: 0, resource: null});
    }

    input.value = '';
    control.setValue(null);
    event.option.deselect();
  }

  addTenant() {
    if (!this.formGroup.valid) {
      this.formGroup.markAllAsTouched();
      return;
    }

    const tenant: Tenant = {
      id: null,
      name: this.formGroup.controls.name.value,
      enabled: this.formGroup.controls.enabled.value,
      createTime: null,
      updateTime: null,
      user: [],
      client: [],
    };

    for (const user of this.formGroup.controls.manager.value) {
      user.role = ROLE_TENANT_MANAGER;
      tenant.user.push(user);
    }

    this.tenantAPI.addTenant(tenant).subscribe(() => {
      this.snackBar.open('租户已创建', 'OK', {
        duration: 2000,
      });

      this.changed.emit(true);
    });
  }

  updateTenant() {
    if (!this.formGroup.valid) {
      this.formGroup.markAllAsTouched();
      return;
    }

    const tenant = this.tenant();
    if (!tenant) {
      return;
    }

    tenant.name = this.formGroup.controls.name.value;
    tenant.enabled = this.formGroup.controls.enabled.value;
    tenant.user = tenant.user.filter(user => user.role !== ROLE_TENANT_MANAGER);

    for (const user of this.formGroup.controls.manager.value) {
      user.role = ROLE_TENANT_MANAGER;
      tenant.user.push(user);
    }

    this.tenantAPI.updateTenant(tenant.id!, tenant).subscribe(() => {
      this.snackBar.open('租户已修改', 'OK', {
        duration: 2000,
      });

      this.changed.emit(true);
    });
  }

  removeTenant() {
    const tenant = this.tenant();
    if (tenant) {
      this.tenantAPI.removeTenant(tenant.id!).subscribe(() => {
        this.snackBar.open('租户已删除', 'OK', {
          duration: 2000,
        });

        this.changed.emit(true);
      });
    }
  }

  cancelTenant() {
    this.changed.emit(false);
  }

}
