import { Component, effect, ElementRef, input, output, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
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
import { map, Observable, startWith } from 'rxjs';

import { Client, ClientAPI, PartnerType, ROLE_TENANT_UPSTREAM_OBSERVER_DIRECT, ROLE_TENANT_UPSTREAM_OBSERVER_PROGRAMMATIC, TenantAPI, TenantUser, User, UserAPI } from '../../../../core';
import { TenantService } from '../../../../services';

interface ClientFormControls {
  upstream: FormControl<TenantUser[]>;
  name: FormControl<string>;
  code: FormControl<string>;
  protocolKey: FormControl<string>;
  remark: FormControl<string | null>;
}

@Component({
  selector: 'carambola-client-form',
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
  templateUrl: './client-form.component.html',
  styleUrls: ['./client-form.component.scss'],
})
export class ClientFormComponent {
  private formBuilder = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private tenantService = inject(TenantService);
  private clientAPI = inject(ClientAPI);
  private tenantAPI = inject(TenantAPI);
  private userAPI = inject(UserAPI);

  PartnerType = PartnerType;

  formGroup: FormGroup<ClientFormControls>;
  separatorKeysCodes: number[] = [ENTER, COMMA];
  allUsers: User[] = [];
  ctrlUpstream = new FormControl<string | null>(null);
  filteredUpstream: Observable<User[]> = new Observable<User[]>();
  @ViewChild('inputUpstream') inputUpstream: ElementRef<HTMLInputElement> | undefined;

  readonly = false;

  mode = input<PartnerType>(PartnerType.PARTNER_TYPE_DIRECT);
  client = input<Client | null>(null);
  changed = output<boolean>();

  constructor() {
    this.formGroup = this.formBuilder.group({
      upstream: this.formBuilder.nonNullable.control<TenantUser[]>([]),
      name: this.formBuilder.nonNullable.control('', Validators.required),
      code: this.formBuilder.nonNullable.control('', Validators.required),
      protocolKey: this.formBuilder.nonNullable.control('', Validators.required),
      remark: this.formBuilder.control<string | null>(''),
    });

    effect(() => {
      const client = this.client();
      const mode = this.mode();

      if (!client) {
        this.formGroup.setControl('upstream', this.createUpstreamControl([]), {emitEvent: false});
        this.formGroup.setControl('name', this.createRequiredTextControl(''), {emitEvent: false});
        this.formGroup.setControl('code', this.createRequiredTextControl('', false, mode !== PartnerType.PARTNER_TYPE_DIRECT), {emitEvent: false});
        this.formGroup.setControl('protocolKey', this.createRequiredTextControl('', false, mode !== PartnerType.PARTNER_TYPE_DIRECT), {emitEvent: false});
        this.formGroup.setControl('remark', this.createOptionalTextControl(''), {emitEvent: false});
      } else {
        const tenant = this.tenantService.tenant();

        this.readonly = !this.tenantService.isTenantManager() && !this.tenantService.isManager();

        if (!this.readonly) {
          this.userAPI.getUserList().subscribe(data => {
            this.allUsers = data;
            this.filteredUpstream = this.ctrlUpstream.valueChanges.pipe(
              startWith(null),
              map((username: string | null) => (username ? this._filter(username) : this.allUsers.slice())),
            );
          });
        }

        const upstream: TenantUser[] = [];
        if (tenant && tenant.user) {
          for (const user of tenant.user) {
            if ((user.role === ROLE_TENANT_UPSTREAM_OBSERVER_DIRECT || user.role === ROLE_TENANT_UPSTREAM_OBSERVER_PROGRAMMATIC) && user.resource === client.id) {
              upstream.push(user);
            }
          }
        }

        this.formGroup.setControl('upstream', this.createUpstreamControl(upstream), {emitEvent: false});
        this.formGroup.setControl('name', this.createRequiredTextControl(client.name), {emitEvent: false});
        this.formGroup.setControl('code', this.createRequiredTextControl(client.code, this.readonly, mode !== PartnerType.PARTNER_TYPE_DIRECT), {emitEvent: false});
        this.formGroup.setControl('protocolKey', this.createRequiredTextControl(client.protocolKey?.join(', ') ?? '', this.readonly, mode !== PartnerType.PARTNER_TYPE_DIRECT), {emitEvent: false});
        this.formGroup.setControl('remark', this.createOptionalTextControl(client.remark), {emitEvent: false});
      }
    });
  }

  get upstreamUsers(): TenantUser[] {
    return this.formGroup.controls.upstream.value;
  }

  private createUpstreamControl(value: TenantUser[], disabled = this.readonly): FormControl<TenantUser[]> {
    return this.formBuilder.nonNullable.control({value, disabled});
  }

  private createRequiredTextControl(value: string, disabled = this.readonly, required = true): FormControl<string> {
    return required
      ? this.formBuilder.nonNullable.control({value, disabled}, Validators.required)
      : this.formBuilder.nonNullable.control({value, disabled});
  }

  private createOptionalTextControl(value: string | null, disabled = this.readonly): FormControl<string | null> {
    return this.formBuilder.control({value, disabled});
  }

  private _filter(value: string): User[] {
    const filterValue = value.toLowerCase();

    return this.allUsers.filter(user => user.username.toLowerCase().includes(filterValue));
  }

  add(event: MatChipInputEvent, control: FormControl<string | null> | null, users: TenantUser[]): void {
    const value = event.value?.trim();

    if (value && users.map(user => user.username).indexOf(value) < 0) {
      users.push({id: null, username: value, role: this.mode() === PartnerType.PARTNER_TYPE_DIRECT ? ROLE_TENANT_UPSTREAM_OBSERVER_DIRECT : ROLE_TENANT_UPSTREAM_OBSERVER_PROGRAMMATIC, resource: null});
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
      users.push({id: null, username: value, role: this.mode() === PartnerType.PARTNER_TYPE_DIRECT ? ROLE_TENANT_UPSTREAM_OBSERVER_DIRECT : ROLE_TENANT_UPSTREAM_OBSERVER_PROGRAMMATIC, resource: null});
    }

    input.value = '';
    control.setValue(null);
    event.option.deselect();
  }

  addClient() {
    if (!this.formGroup.valid) {
      this.formGroup.markAllAsTouched();
      return;
    }

    let keys: string[] = [];
    if (this.mode() === PartnerType.PARTNER_TYPE_PROGRAMMATIC) {
      for (const key of this.formGroup.controls.protocolKey.value.split('，')) {
        keys = [...keys, ...key.split(',')];
      }
      keys = keys.map(key => key.trim()).filter(key => key.length > 0);
    }

    const client: Client = {
      id: null,
      deleted: false,
      tenant: this.tenantService.tenant()!,
      name: this.formGroup.controls.name.value,
      mode: this.mode(),
      code: this.formGroup.controls.code.value,
      protocolKey: keys,
      remark: this.formGroup.controls.remark.value,
      createTime: null,
      updateTime: null,
    };

    this.clientAPI.addClient(client).subscribe((client) => {
      const tenant = this.tenantService.tenant()!;
      const upstream = this.formGroup.controls.upstream.value;
      if (upstream.length > 0) {
        for (const user of upstream) {
          tenant.user.push({id: null, username: user.username, role: this.mode() === PartnerType.PARTNER_TYPE_DIRECT ? ROLE_TENANT_UPSTREAM_OBSERVER_DIRECT : ROLE_TENANT_UPSTREAM_OBSERVER_PROGRAMMATIC, resource: client.id});
        }
        this.tenantAPI.updateTenant(tenant.id!, tenant).subscribe();
      }

      this.snackBar.open('广告主已创建', 'OK', {
        duration: 2000,
      });

      this.changed.emit(true);
    });
  }

  updateClient() {
    if (!this.formGroup.valid) {
      this.formGroup.markAllAsTouched();
      return;
    }

    const client = this.client();
    if (!client) {
      return;
    }

    let keys: string[] = [];
    for (const key of this.formGroup.controls.protocolKey.value.split('，')) {
      keys = [...keys, ...key.split(',')];
    }
    keys = keys.map(key => key.trim()).filter(key => key.length > 0);

    client.tenant = this.tenantService.tenant()!;
    client.name = this.formGroup.controls.name.value;
    client.code = this.formGroup.controls.code.value;
    client.remark = this.formGroup.controls.remark.value;
    client.protocolKey = keys;

    this.clientAPI.updateClient(client.id!, client).subscribe(() => {
      const tenant = this.tenantService.tenant()!;
      const upstream = this.formGroup.controls.upstream.value;
      if (upstream.length >= 0) {
        const observers: TenantUser[] = [];
        let usersToBeChecked = tenant.user.filter(user => user.role === (this.mode() === PartnerType.PARTNER_TYPE_DIRECT ? ROLE_TENANT_UPSTREAM_OBSERVER_DIRECT : ROLE_TENANT_UPSTREAM_OBSERVER_PROGRAMMATIC) && user.resource === client.id);
        let changed = false;

        for (const user of upstream) {
          if (usersToBeChecked.filter(u => u.username === user.username).length > 0) {
            usersToBeChecked = usersToBeChecked.filter(u => u.username !== user.username);
          } else {
            changed = true;
          }
          observers.push({id: null, username: user.username, role: (this.mode() === PartnerType.PARTNER_TYPE_DIRECT ? ROLE_TENANT_UPSTREAM_OBSERVER_DIRECT : ROLE_TENANT_UPSTREAM_OBSERVER_PROGRAMMATIC), resource: client.id});
        }

        if (usersToBeChecked.length > 0) {
          changed = true;
        }

        if (changed) {
          tenant.user = tenant.user.filter(user => user.role !== (this.mode() === PartnerType.PARTNER_TYPE_DIRECT ? ROLE_TENANT_UPSTREAM_OBSERVER_DIRECT : ROLE_TENANT_UPSTREAM_OBSERVER_PROGRAMMATIC) || user.resource !== client.id);
          tenant.user.push(...observers);
          this.tenantAPI.updateTenant(tenant.id!, tenant).subscribe();
        }
      }

      this.snackBar.open('广告主已修改', 'OK', {
        duration: 2000,
      });

      this.changed.emit(true);
    });
}

  removeClient() {
    const client = this.client();
    if (client) {
      this.clientAPI.removeClient(client.id!).subscribe(() => {
        this.snackBar.open('广告主已删除', 'OK', {
          duration: 2000,
        });

        this.changed.emit(true);
      });
    }
  }

  cancelClient() {
    this.changed.emit(false);
  }

}
