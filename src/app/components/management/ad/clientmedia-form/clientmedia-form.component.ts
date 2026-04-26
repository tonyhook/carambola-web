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

import { Client, ClientAPI, ClientMedia, ClientMediaAPI, PartnerType } from '../../../../core';
import { TenantService } from '../../../../services';
import { FilteredSelectClientComponent } from '../../../../shared';

interface ClientMediaFormControls {
  client: FormControl<Client | null>;
  name: FormControl<string>;
  platform: FormControl<string>;
  code: FormControl<string | null>;
  secret: FormControl<string | null>;
  apppackage: FormControl<string | null>;
  appversion: FormControl<string | null>;
  applink: FormControl<string | null>;
  remark: FormControl<string | null>;
}

@Component({
  selector: 'carambola-clientmedia-form',
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
    FilteredSelectClientComponent,
  ],
  templateUrl: './clientmedia-form.component.html',
  styleUrls: ['./clientmedia-form.component.scss'],
})
export class ClientMediaFormComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private tenantService = inject(TenantService);
  private clientAPI = inject(ClientAPI);
  private clientMediaAPI = inject(ClientMediaAPI);

  formGroup: FormGroup<ClientMediaFormControls>;
  clients: WritableSignal<Client[]> = signal([]);
  managedClients: WritableSignal<Client[]> = signal([]);

  initialized = false;

  readonly = false;

  mode = input<PartnerType>(PartnerType.PARTNER_TYPE_DIRECT);
  clientId = input<number>(0);
  clientMedia = input<ClientMedia | null>(null);
  changed = output<boolean>();

  constructor() {
    this.formGroup = this.formBuilder.group({
      client: this.formBuilder.control<Client | null>(null, Validators.required),
      name: this.formBuilder.nonNullable.control('', Validators.required),
      platform: this.formBuilder.nonNullable.control('Android', Validators.required),
      code: this.formBuilder.control<string | null>(''),
      secret: this.formBuilder.control<string | null>(''),
      apppackage: this.formBuilder.control<string | null>(''),
      appversion: this.formBuilder.control<string | null>(''),
      applink: this.formBuilder.control<string | null>(''),
      remark: this.formBuilder.control<string | null>(''),
    });

    effect(() => {
      const clientMedia = this.clientMedia();
      const clientId = this.clientId();
      const clients = this.clients();

      if (!this.initialized) {
        if (!clientMedia) {
          if (clientId > 0) {
            const client = clients.find(client => client.id === clientId) ?? null;
            if (client) {
              this.initialized = true;

              this.formGroup.setControl('client', this.createClientControl(client), {emitEvent: false});
            }
          } else {
            this.initialized = true;

            this.formGroup.setControl('client', this.createClientControl(null, false), {emitEvent: false});
          }
        } else {
          this.readonly = !this.tenantService.isTenantManager() && !this.tenantService.isManager();

          const client = clients.find(client => client.id === clientMedia.client.id);
          if (client) {
            this.initialized = true;

            this.formGroup.setControl('client', this.createClientControl(client), {emitEvent: false});
            this.formGroup.setControl('name', this.createRequiredTextControl(clientMedia.name), {emitEvent: false});
            this.formGroup.setControl('platform', this.createRequiredTextControl(clientMedia.platform), {emitEvent: false});
            this.formGroup.setControl('code', this.createOptionalTextControl(clientMedia.code), {emitEvent: false});
            this.formGroup.setControl('secret', this.createOptionalTextControl(clientMedia.secret), {emitEvent: false});
            this.formGroup.setControl('apppackage', this.createOptionalTextControl(clientMedia.apppackage), {emitEvent: false});
            this.formGroup.setControl('appversion', this.createOptionalTextControl(clientMedia.appversion), {emitEvent: false});
            this.formGroup.setControl('applink', this.createOptionalTextControl(clientMedia.applink), {emitEvent: false});
            this.formGroup.setControl('remark', this.createOptionalTextControl(clientMedia.remark), {emitEvent: false});
          }
        }
      }
    });
  }

  private createClientControl(value: Client | null, disabled = this.readonly): FormControl<Client | null> {
    return this.formBuilder.control({value, disabled}, Validators.required);
  }

  private createRequiredTextControl(value: string, disabled = this.readonly): FormControl<string> {
    return this.formBuilder.nonNullable.control({value, disabled}, Validators.required);
  }

  private createOptionalTextControl(value: string | null, disabled = this.readonly): FormControl<string | null> {
    return this.formBuilder.control({value, disabled});
  }

  ngOnInit() {
    this.clientAPI.getClientList({
      filter: {
        mode: [String(this.mode())],
      },
      searchKey: [],
      searchValue: '',
    }).subscribe(data => {
      this.clients.set(data.filter(client => !client.deleted));
      this.managedClients.set(this.clients());
    });
  }

  addClientMedia() {
    if (!this.formGroup.valid) {
      this.formGroup.markAllAsTouched();
      return;
    }

    const client = this.formGroup.controls.client.value;
    if (!client) {
      this.formGroup.markAllAsTouched();
      return;
    }

    const clientMedia: ClientMedia = {
      id: null,
      deleted: false,
      client,
      name: this.formGroup.controls.name.value,
      platform: this.formGroup.controls.platform.value,
      code: this.formGroup.controls.code.value,
      secret: this.formGroup.controls.secret.value,
      apppackage: this.formGroup.controls.apppackage.value,
      appversion: this.formGroup.controls.appversion.value,
      applink: this.formGroup.controls.applink.value,
      remark: this.formGroup.controls.remark.value,
      createTime: null,
      updateTime: null,
    };

    this.clientMediaAPI.addClientMedia(clientMedia).subscribe(() => {
      this.snackBar.open('上游媒体已创建', 'OK', {
        duration: 2000,
      });

      this.changed.emit(true);
    });
  }

  updateClientMedia() {
    if (!this.formGroup.valid) {
      this.formGroup.markAllAsTouched();
      return;
    }

    const clientMedia = this.clientMedia();
    const client = this.formGroup.controls.client.value;
    if (!clientMedia || !client) {
      return;
    }

    clientMedia.client = client;
    clientMedia.name = this.formGroup.controls.name.value;
    clientMedia.platform = this.formGroup.controls.platform.value;
    clientMedia.code = this.formGroup.controls.code.value;
    clientMedia.secret = this.formGroup.controls.secret.value;
    clientMedia.apppackage = this.formGroup.controls.apppackage.value;
    clientMedia.appversion = this.formGroup.controls.appversion.value;
    clientMedia.applink = this.formGroup.controls.applink.value;
    clientMedia.remark = this.formGroup.controls.remark.value;

    this.clientMediaAPI.updateClientMedia(clientMedia.id!, clientMedia).subscribe(() => {
      this.snackBar.open('上游媒体已修改', 'OK', {
        duration: 2000,
      });

      this.changed.emit(true);
    });
  }

  removeClientMedia() {
    const clientMedia = this.clientMedia();
    if (clientMedia) {
      this.clientMediaAPI.removeClientMedia(clientMedia.id!).subscribe(() => {
        this.snackBar.open('上游媒体已删除', 'OK', {
          duration: 2000,
        });

        this.changed.emit(true);
      });
    }
  }

  cancelClientMedia() {
    this.changed.emit(false);
  }

}
