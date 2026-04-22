import { Component, effect, ElementRef, input, OnInit, output, ViewChild, inject } from '@angular/core';
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
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { map, Observable, startWith } from 'rxjs';

import { ROLE_TENANT_DOWNSTREAM_MANAGER_DIRECT, ROLE_TENANT_DOWNSTREAM_MANAGER_PROGRAMMATIC, ROLE_TENANT_MANAGER, ROLE_TENANT_OBSERVER, ROLE_TENANT_OPERATOR, ROLE_TENANT_UPSTREAM_OBSERVER_DIRECT, ROLE_TENANT_UPSTREAM_OBSERVER_PROGRAMMATIC, Tenant, TenantAPI, TenantUser, User, UserAPI } from '../../../../core';
import { TenantService } from '../../../../services';

@Component({
  selector: 'carambola-tenant-form',
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
    MatTabsModule,
  ],
  templateUrl: './tenant-form.component.html',
  styleUrls: ['./tenant-form.component.scss'],
})
export class TenantFormComponent implements OnInit {
  private formBuilder = inject(UntypedFormBuilder);
  private snackBar = inject(MatSnackBar);
  tenantService = inject(TenantService);
  private tenantAPI = inject(TenantAPI);
  private userAPI = inject(UserAPI);

  formGroup: UntypedFormGroup;
  separatorKeysCodes: number[] = [ENTER, COMMA];
  allUsers: User[] = [];
  ctrlManager = new FormControl(null);
  ctrlOperator = new FormControl(null);
  ctrlObserver = new FormControl(null);
  filteredManager: Observable<User[]> = new Observable<User[]>();
  filteredOperator: Observable<User[]> = new Observable<User[]>();
  filteredObserver: Observable<User[]> = new Observable<User[]>();
  @ViewChild('inputManager') inputManager: ElementRef<HTMLInputElement> | undefined;
  @ViewChild('inputOperator') inputOperator: ElementRef<HTMLInputElement> | undefined;
  @ViewChild('inputObserver') inputObserver: ElementRef<HTMLInputElement> | undefined;

  readonly = false;

  tenant = input<Tenant | null>(null);
  changed = output<boolean>();

  constructor() {
    this.formGroup = this.formBuilder.group({
      'name': ['', Validators.required],
      'manager': [[], Validators.required],
      'operator': [[], null],
      'observer': [[], null],
      'upstream': [[], null],
      'downstream': [[], null],
      'enabled': [true, Validators.required],
    });

    effect(() => {
      const tenant = this.tenant();

      if (!tenant) {
        return;
      }

      this.readonly = !this.tenantService.isTenantManager() && !this.tenantService.isManager();

      const managers: TenantUser[] = [];
      if (tenant.user) {
        for (const user of tenant.user) {
          if (user.role === ROLE_TENANT_MANAGER) {
            managers.push(user);
          }
        }
      }
      const operators: TenantUser[] = [];
      if (tenant.user) {
        for (const user of tenant.user) {
          if (user.role === ROLE_TENANT_OPERATOR) {
            operators.push(user);
          }
        }
      }
      const observers: TenantUser[] = [];
      if (tenant.user) {
        for (const user of tenant.user) {
          if (user.role === ROLE_TENANT_OBSERVER) {
            observers.push(user);
          }
        }
      }
      const upstream: TenantUser[] = [];
      if (tenant.user) {
        for (const user of tenant.user) {
          if (user.role === ROLE_TENANT_UPSTREAM_OBSERVER_DIRECT || user.role === ROLE_TENANT_UPSTREAM_OBSERVER_PROGRAMMATIC) {
            upstream.push(user);
          }
        }
      }
      const downstream: TenantUser[] = [];
      if (tenant.user) {
        for (const user of tenant.user) {
          if (user.role === ROLE_TENANT_DOWNSTREAM_MANAGER_DIRECT || user.role === ROLE_TENANT_DOWNSTREAM_MANAGER_PROGRAMMATIC) {
            downstream.push(user);
          }
        }
      }

      this.formGroup.setControl('name', this.formBuilder.control({value: tenant.name, disabled: this.readonly}, Validators.required), {emitEvent: false});
      this.formGroup.setControl('manager', this.formBuilder.control({value: managers, disabled: this.readonly}, Validators.required), {emitEvent: false});
      this.formGroup.setControl('operator', this.formBuilder.control({value: operators, disabled: this.readonly}, null), {emitEvent: false});
      this.formGroup.setControl('observer', this.formBuilder.control({value: observers, disabled: this.readonly}, null), {emitEvent: false});
      this.formGroup.setControl('upstream', this.formBuilder.control({value: upstream, disabled: this.readonly}, null), {emitEvent: false});
      this.formGroup.setControl('downstream', this.formBuilder.control({value: downstream, disabled: this.readonly}, null), {emitEvent: false});
      this.formGroup.setControl('enabled', this.formBuilder.control({value: tenant.enabled, disabled: this.readonly}, Validators.required), {emitEvent: false});
    });
  }

  ngOnInit() {
    this.userAPI.getUserList().subscribe(data => {
      this.allUsers = data;
      this.filteredManager = this.ctrlManager.valueChanges.pipe(
        startWith(null),
        map((username: string | null) => (username ? this._filter(username) : this.allUsers.slice())),
      );
      this.filteredOperator = this.ctrlOperator.valueChanges.pipe(
        startWith(null),
        map((username: string | null) => (username ? this._filter(username) : this.allUsers.slice())),
      );
      this.filteredObserver = this.ctrlObserver.valueChanges.pipe(
        startWith(null),
        map((username: string | null) => (username ? this._filter(username) : this.allUsers.slice())),
      );
    });
  }

  private _filter(value: string): User[] {
    const filterValue = value.toLowerCase();

    return this.allUsers.filter(user => user.username.toLowerCase().includes(filterValue));
  }

  add(event: MatChipInputEvent, control: FormControl | null, users: TenantUser[]): void {
    const value = event.value;

    if (users.map(user => user.username).indexOf(value) < 0) {
      users.push({id: null, username: value, role: 0, resource: null});
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
      users.push({id: null, username: value, role: 0, resource: null});
    }

    input.value = '';
    control.setValue(null);
    event.option.deselect();
  }

  getClientName(id: number) {
    const tenant = this.tenant();
    if (!tenant) {
      return '';
    }

    const client = tenant.client.find(client => client.id === id);

    if (client) {
      return client.name;
    } else {
      return '';
    }
  }

  getVendorName(id: number) {
    const tenant = this.tenant();
    if (!tenant) {
      return '';
    }

    const vendor = tenant.vendor.find(vendor => vendor.id === id);

    if (vendor) {
      return vendor.name;
    } else {
      return '';
    }
  }

  addTenant() {
    if (!this.formGroup.valid) {
      this.formGroup.markAllAsTouched();
      return;
    }

    const tenant: Tenant = {
      id: null,
      name: this.formGroup.value.name,
      enabled: this.formGroup.value.enabled,
      createTime: null,
      updateTime: null,
      user: [],
      client: [],
      vendor: []
    };

    for (const user of this.formGroup.value.manager) {
      user.role = ROLE_TENANT_MANAGER;
      tenant.user.push(user);
    }
    for (const user of this.formGroup.value.operator) {
      user.role = ROLE_TENANT_OPERATOR;
      tenant.user.push(user);
    }
    for (const user of this.formGroup.value.observer) {
      user.role = ROLE_TENANT_OBSERVER;
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

    tenant.name = this.formGroup.value.name;
    tenant.enabled = this.formGroup.value.enabled;
    tenant.user = [];

    for (const user of this.formGroup.value.manager) {
      user.role = ROLE_TENANT_MANAGER;
      tenant.user.push(user);
    }
    for (const user of this.formGroup.value.operator) {
      user.role = ROLE_TENANT_OPERATOR;
      tenant.user.push(user);
    }
    for (const user of this.formGroup.value.observer) {
      user.role = ROLE_TENANT_OBSERVER;
      tenant.user.push(user);
    }
    for (const user of this.formGroup.value.upstream) {
      // only removal is allowed
      tenant.user.push(user);
    }
    for (const user of this.formGroup.value.downstream) {
      // only removal is allowed
      tenant.user.push(user);
    }

    if (tenant) {
      tenant.name = this.formGroup.value.name;

      this.tenantAPI.updateTenant(tenant.id!, tenant).subscribe(() => {
        this.snackBar.open('租户已修改', 'OK', {
          duration: 2000,
        });

        this.changed.emit(true);
      });
    }
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
