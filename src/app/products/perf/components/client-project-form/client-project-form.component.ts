import { Component, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { of, switchMap } from 'rxjs';

import { Client, ClientAPI, ClientProject, ClientProjectAPI, ROLE_CLIENT_PROJECT_MANAGER, TenantService, TenantUser } from '../..';
import { AuthService } from '../../../../services';
import { TenantUserService } from '../../services/tenant-user.service';
import { UserChipInputComponent } from '../../shared/user-chip-input/user-chip-input.component';

interface ClientProjectFormControls {
  client: FormControl<Client | null>;
  name: FormControl<string>;
  remark: FormControl<string>;
  managers: FormControl<string[]>;
}

@Component({
  selector: 'carambola-perf-client-project-form',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTabsModule,
    UserChipInputComponent,
  ],
  templateUrl: './client-project-form.component.html',
  styleUrls: ['./client-project-form.component.scss'],
})
export class ClientProjectFormComponent {
  private formBuilder = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private clientAPI = inject(ClientAPI);
  private clientProjectAPI = inject(ClientProjectAPI);
  private tenantUserService = inject(TenantUserService);
  private authService = inject(AuthService);
  tenantService = inject(TenantService);

  clientProject = input<ClientProject | null>(null);
  changed = output<boolean>();
  clients = signal<Client[]>([]);

  formGroup: FormGroup<ClientProjectFormControls> = this.formBuilder.group({
    client: this.formBuilder.control<Client | null>(null, Validators.required),
    name: this.formBuilder.nonNullable.control('', Validators.required),
    remark: this.formBuilder.nonNullable.control(''),
    managers: this.formBuilder.nonNullable.control<string[]>([]),
  });

  constructor() {
    this.clientAPI.getClientList().subscribe(clients => this.clients.set(clients.filter(client => !client.deleted)));

    effect(() => {
      const project = this.clientProject();
      const clients = this.clients();
      this.applyControlAccess();
      if (!project) {
        if (!this.formGroup.controls.client.value && clients.length === 1) {
          this.formGroup.controls.client.setValue(clients[0], {emitEvent: false});
        }
        if (this.tenantService.isClientSub() && !this.canEditProjectUsers()) {
          this.setCurrentUserAsOnlyManager();
        } else if (this.canEditProjectUsers()) {
          this.formGroup.controls.managers.setValue([], {emitEvent: false});
        }
        return;
      }

      const client = clients.find(client => client.id === project.client?.id) ?? project.client;
      this.formGroup.controls.client.setValue(client, {emitEvent: false});
      this.formGroup.controls.name.setValue(project.name ?? '', {emitEvent: false});
      this.formGroup.controls.remark.setValue(project.remark ?? '', {emitEvent: false});

      const tenant = this.formGroup.controls.client.value?.tenant ?? project.client?.tenant ?? this.tenantService.tenant();
      if (this.tenantService.isClientProjectManager(project.id)) {
        this.setCurrentUserAsOnlyManager();
      } else if (tenant?.id && project.id) {
        this.tenantUserService.getResourceUsernames(tenant.id, ROLE_CLIENT_PROJECT_MANAGER, project.id).subscribe(usernames => {
          this.formGroup.controls.managers.setValue(usernames, {emitEvent: false});
        });
      }
    });
  }

  canEditProjectDetails(): boolean {
    const project = this.clientProject();
    return this.tenantService.isTenantManager()
      || this.tenantService.isManager()
      || this.tenantService.isClientManager(project?.client?.id)
      || this.tenantService.isClientProjectManager(project?.id)
      || (!project && (this.tenantService.isClient() || this.tenantService.isClientSub()));
  }

  canEditProjectClient(): boolean {
    const project = this.clientProject();
    return this.tenantService.isTenantManager()
      || this.tenantService.isManager()
      || this.tenantService.isClientManager(project?.client?.id)
      || (!project && (this.tenantService.isClient() || this.tenantService.isClientSub()));
  }

  shouldSyncProjectUsers(): boolean {
    const project = this.clientProject();
    return this.tenantService.isTenantManager()
      || this.tenantService.isManager()
      || this.tenantService.isClientManager(project?.client?.id)
      || (!project && this.tenantService.isClient());
  }

  canEditProjectUsers(): boolean {
    const project = this.clientProject();
    return this.tenantService.isTenantManager()
      || this.tenantService.isManager()
      || this.tenantService.isClientManager(project?.client?.id)
      || (!project && this.tenantService.isClient());
  }

  canLoadProjectUsers(): boolean {
    return this.canEditProjectUsers();
  }

  canRemoveProject(): boolean {
    return this.canEditProjectDetails();
  }

  saveClientProject() {
    if (!this.formGroup.valid) {
      this.formGroup.markAllAsTouched();
      return;
    }

    const currentProject = this.clientProject();
    const client = this.formGroup.controls.client.value;
    const tenant = client?.tenant ?? this.tenantService.tenant();
    if (!client || !tenant?.id || !this.canEditProjectDetails()) {
      return;
    }

    const project: ClientProject = {
      id: currentProject?.id ?? null,
      deleted: currentProject?.deleted ?? false,
      client,
      name: this.formGroup.controls.name.value,
      remark: this.formGroup.controls.remark.value,
      createTime: currentProject?.createTime ?? null,
      updateTime: currentProject?.updateTime ?? null,
    };

    const request = currentProject?.id
      ? this.clientProjectAPI.updateClientProject(currentProject.id, project).pipe(switchMap(() => this.shouldSyncProjectUsers()
        ? this.tenantUserService.syncResourceUsers(tenant.id!, ROLE_CLIENT_PROJECT_MANAGER, currentProject.id!, this.managerUsernames)
        : of(null)))
      : this.clientProjectAPI.addClientProject(project).pipe(switchMap(savedProject => {
        this.syncCurrentUserProjectManager(savedProject);
        return this.shouldSyncProjectUsers()
          ? this.tenantUserService.syncResourceUsers(tenant.id!, ROLE_CLIENT_PROJECT_MANAGER, savedProject.id!, this.managerUsernames)
          : of(null);
      }));

    request.subscribe(() => {
      this.snackBar.open(currentProject ? '产品已修改' : '产品已创建', 'OK', {duration: 2000});
      this.changed.emit(true);
    });
  }

  removeClientProject() {
    const project = this.clientProject();
    if (!project?.id || !this.canRemoveProject()) {
      return;
    }

    this.clientProjectAPI.removeClientProject(project.id).subscribe(() => {
      this.snackBar.open('产品已删除', 'OK', {duration: 2000});
      this.changed.emit(true);
    });
  }

  cancelClientProject() {
    this.changed.emit(false);
  }

  get managerUsernames(): string[] {
    return this.formGroup.controls.managers.value;
  }

  private setCurrentUserAsOnlyManager() {
    const username = this.authService.credential()?.username;
    this.formGroup.controls.managers.setValue(username ? [username] : [], {emitEvent: false});
  }

  private syncCurrentUserProjectManager(project: ClientProject) {
    const tenant = this.tenantService.tenant();
    const username = this.authService.credential()?.username;
    if (this.shouldSyncProjectUsers() || !this.tenantService.isClientSub() || !tenant || !project.id || !username) {
      return;
    }

    if (!tenant.user) {
      tenant.user = [];
    }

    const exists = tenant.user.some(user => user.username === username && user.role === ROLE_CLIENT_PROJECT_MANAGER && user.resource === project.id);
    if (exists) {
      return;
    }

    const user: TenantUser = {
      id: null,
      username,
      role: ROLE_CLIENT_PROJECT_MANAGER,
      resource: project.id,
    };
    tenant.user.push(user);
  }

  private applyControlAccess() {
    const canEditDetails = this.canEditProjectDetails();
    const canEditClient = this.canEditProjectClient();
    const canEditUsers = this.canEditProjectUsers();

    this.formGroup.enable({emitEvent: false});

    if (!canEditDetails) {
      this.formGroup.controls.name.disable({emitEvent: false});
      this.formGroup.controls.remark.disable({emitEvent: false});
    }

    if (!canEditClient) {
      this.formGroup.controls.client.disable({emitEvent: false});
    }

    if (!canEditUsers) {
      this.formGroup.controls.managers.disable({emitEvent: false});
    }
  }
}
