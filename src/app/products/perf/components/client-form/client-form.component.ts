import { Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { switchMap } from 'rxjs';

import { Client, ClientAPI, ROLE_CLIENT_MANAGER, TenantService } from '../..';
import { TenantUserService } from '../../services/tenant-user.service';
import { UserChipInputComponent } from '../../shared/user-chip-input/user-chip-input.component';

interface ClientFormControls {
  name: FormControl<string>;
  remark: FormControl<string>;
  managers: FormControl<string[]>;
}

@Component({
  selector: 'carambola-perf-client-form',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatTabsModule,
    UserChipInputComponent,
  ],
  templateUrl: './client-form.component.html',
  styleUrls: ['./client-form.component.scss'],
})
export class ClientFormComponent {
  private formBuilder = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private clientAPI = inject(ClientAPI);
  private tenantUserService = inject(TenantUserService);
  tenantService = inject(TenantService);

  client = input<Client | null>(null);
  changed = output<boolean>();

  formGroup: FormGroup<ClientFormControls> = this.formBuilder.group({
    name: this.formBuilder.nonNullable.control('', Validators.required),
    remark: this.formBuilder.nonNullable.control(''),
    managers: this.formBuilder.nonNullable.control<string[]>([]),
  });

  readonly = false;

  constructor() {
    effect(() => {
      const client = this.client();
      this.readonly = !this.tenantService.isTenantManager() && !this.tenantService.isManager();

      if (!client) {
        return;
      }

      this.formGroup.controls.name.setValue(client.name ?? '', {emitEvent: false});
      this.formGroup.controls.remark.setValue(client.remark ?? '', {emitEvent: false});

      if (client.tenant?.id && client.id) {
        this.tenantUserService.getResourceUsernames(client.tenant.id, ROLE_CLIENT_MANAGER, client.id).subscribe(usernames => {
          this.formGroup.controls.managers.setValue(usernames, {emitEvent: false});
        });
      }

      if (this.readonly) {
        this.formGroup.disable({emitEvent: false});
      }
    });
  }

  saveClient() {
    if (!this.formGroup.valid) {
      this.formGroup.markAllAsTouched();
      return;
    }

    const currentTenant = this.tenantService.tenant();
    const currentClient = this.client();
    const tenant = currentClient?.tenant ?? currentTenant;
    if (!tenant?.id) {
      return;
    }

    const client: Client = {
      id: currentClient?.id ?? null,
      deleted: currentClient?.deleted ?? false,
      tenant,
      name: this.formGroup.controls.name.value,
      remark: this.formGroup.controls.remark.value,
      createTime: currentClient?.createTime ?? null,
      updateTime: currentClient?.updateTime ?? null,
    };

    const request = currentClient?.id
      ? this.clientAPI.updateClient(currentClient.id, client).pipe(switchMap(() => this.tenantUserService.syncResourceUsers(tenant.id!, ROLE_CLIENT_MANAGER, currentClient.id!, this.managerUsernames)))
      : this.clientAPI.addClient(client).pipe(switchMap(savedClient => this.tenantUserService.syncResourceUsers(tenant.id!, ROLE_CLIENT_MANAGER, savedClient.id!, this.managerUsernames)));

    request.subscribe(() => {
      this.snackBar.open(currentClient ? '客户已修改' : '客户已创建', 'OK', {duration: 2000});
      this.changed.emit(true);
    });
  }

  removeClient() {
    const client = this.client();
    if (!client?.id) {
      return;
    }

    this.clientAPI.removeClient(client.id).subscribe(() => {
      this.snackBar.open('客户已删除', 'OK', {duration: 2000});
      this.changed.emit(true);
    });
  }

  cancelClient() {
    this.changed.emit(false);
  }

  get managerUsernames(): string[] {
    return this.formGroup.controls.managers.value;
  }
}
