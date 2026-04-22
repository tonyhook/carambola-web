import { Component, effect, ElementRef, input, output, ViewChild, inject } from '@angular/core';
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

import { Client, ClientAPI, PartnerType, ROLE_TENANT_UPSTREAM_OBSERVER_DIRECT, ROLE_TENANT_UPSTREAM_OBSERVER_PROGRAMMATIC, TenantAPI, TenantUser, User, UserAPI } from '../../../../core';
import { TenantService } from '../../../../services';

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
  private formBuilder = inject(UntypedFormBuilder);
  private snackBar = inject(MatSnackBar);
  private tenantService = inject(TenantService);
  private clientAPI = inject(ClientAPI);
  private tenantAPI = inject(TenantAPI);
  private userAPI = inject(UserAPI);

  PartnerType = PartnerType;

  formGroup: UntypedFormGroup;
  separatorKeysCodes: number[] = [ENTER, COMMA];
  allUsers: User[] = [];
  ctrlUpstream = new FormControl(null);
  filteredUpstream: Observable<User[]> = new Observable<User[]>();
  @ViewChild('inputUpstream') inputUpstream: ElementRef<HTMLInputElement> | undefined;

  readonly = false;

  mode = input<PartnerType>(PartnerType.PARTNER_TYPE_DIRECT);
  client = input<Client | null>(null);
  changed = output<boolean>();

  constructor() {
    this.formGroup = this.formBuilder.group({
      'upstream': [[], null],
      'name': ['', Validators.required],
      'code': ['', Validators.required],
      'protocolKey': ['', Validators.required],
      'remark': ['', null],
    });

    effect(() => {
      const client = this.client();
      const mode = this.mode();

      if (!client) {
        this.formGroup.setControl('upstream', this.formBuilder.control([], null), {emitEvent: false});
        this.formGroup.setControl('name', this.formBuilder.control('', Validators.required), {emitEvent: false});
        this.formGroup.setControl('code', this.formBuilder.control('', mode === PartnerType.PARTNER_TYPE_DIRECT ? null : Validators.required), {emitEvent: false});
        this.formGroup.setControl('protocolKey', this.formBuilder.control([], mode === PartnerType.PARTNER_TYPE_DIRECT ? null : Validators.required), {emitEvent: false});
        this.formGroup.setControl('remark', this.formBuilder.control('', null), {emitEvent: false});
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

        this.formGroup.setControl('upstream', this.formBuilder.control({value: upstream, disabled: this.readonly}, null), {emitEvent: false});
        this.formGroup.setControl('name', this.formBuilder.control({value: client.name, disabled: this.readonly}, Validators.required), {emitEvent: false});
        this.formGroup.setControl('code', this.formBuilder.control({value: client.code, disabled: this.readonly}, mode === PartnerType.PARTNER_TYPE_DIRECT ? null : Validators.required), {emitEvent: false});
        this.formGroup.setControl('protocolKey', this.formBuilder.control({value: client.protocolKey?.join(', '), disabled: this.readonly}, mode === PartnerType.PARTNER_TYPE_DIRECT ? null : Validators.required), {emitEvent: false});
        this.formGroup.setControl('remark', this.formBuilder.control({value: client.remark, disabled: this.readonly}, null), {emitEvent: false});
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
      users.push({id: null, username: value, role: this.mode() === PartnerType.PARTNER_TYPE_DIRECT ? ROLE_TENANT_UPSTREAM_OBSERVER_DIRECT : ROLE_TENANT_UPSTREAM_OBSERVER_PROGRAMMATIC, resource: null});
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

    let keys: string[] =[];
    if (this.mode() === PartnerType.PARTNER_TYPE_PROGRAMMATIC) {
      for (const key of this.formGroup.value.protocolKey.split('，')) {
        keys = [...keys, ...key.split(',')];
      }
      keys = keys.map(key => key.trim()).filter(key => key.length > 0);
    }

    const client: Client = {
      id: null,
      deleted: false,
      tenant: this.tenantService.tenant()!,
      name: this.formGroup.value.name,
      mode: this.mode(),
      code: this.formGroup.value.code,
      protocolKey: keys,
      remark: this.formGroup.value.remark,
      createTime: null,
      updateTime: null,
    };

    this.clientAPI.addClient(client).subscribe((client) => {
      const tenant = this.tenantService.tenant()!;
      if (this.formGroup.value.upstream.length > 0) {
        for (const user of this.formGroup.value.upstream) {
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

    let keys: string[] =[];
    for (const key of this.formGroup.value.protocolKey.split('，')) {
      keys = [...keys, ...key.split(',')];
    }
    keys = keys.map(key => key.trim()).filter(key => key.length > 0);

    client.tenant = this.tenantService.tenant()!;
    client.name = this.formGroup.value.name;
    client.code = this.formGroup.value.code;
    client.remark = this.formGroup.value.remark;
    client.protocolKey = keys;

    this.clientAPI.updateClient(client.id!, client).subscribe(() => {
      const tenant = this.tenantService.tenant()!;
      if (this.formGroup.value.upstream.length >= 0) {
        const observers: TenantUser[] = [];
        let usersToBeChecked = tenant.user.filter(user => user.role === (this.mode() === PartnerType.PARTNER_TYPE_DIRECT ? ROLE_TENANT_UPSTREAM_OBSERVER_DIRECT : ROLE_TENANT_UPSTREAM_OBSERVER_PROGRAMMATIC) && user.resource === client.id);
        let changed = false;

        for (const user of this.formGroup.value.upstream) {
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
