import { Component, effect, input, OnInit, output, signal, WritableSignal } from '@angular/core';
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

import { Client, ClientAPI, ClientMedia, ClientMediaAPI, PartnerType } from '../../../../core';
import { TenantService } from '../../../../services';
import { FilteredSelectClientComponent } from '../../../../shared';

@Component({
  selector: 'carambola-clientmedia-form',
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
  formGroup: UntypedFormGroup;
  clients: WritableSignal<Client[]> = signal([]);
  managedClients: WritableSignal<Client[]> = signal([]);

  initialized = false;

  readonly = false;

  mode = input<PartnerType>(PartnerType.PARTNER_TYPE_DIRECT);
  clientId = input<number>(0);
  clientMedia = input<ClientMedia | null>(null);
  changed = output<boolean>();

  constructor(
    private formBuilder: UntypedFormBuilder,
    private snackBar: MatSnackBar,
    private tenantService: TenantService,
    private clientAPI: ClientAPI,
    private clientMediaAPI: ClientMediaAPI,
  ) {
    this.formGroup = this.formBuilder.group({
      'client': [null, Validators.required],
      'name': ['', Validators.required],
      'platform': ['Android', Validators.required],
      'code': ['', null],
      'secret': ['', null],
      'apppackage': ['', null],
      'appversion': ['', null],
      'applink': ['', null],
      'remark': ['', null],
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

              this.formGroup.setControl('client', this.formBuilder.control({value: client, disabled: this.readonly}, Validators.required), {emitEvent: false});
            }
          } else {
            this.initialized = true;

            this.formGroup.setControl('client', this.formBuilder.control(null, Validators.required), {emitEvent: false});
          }
        } else {
          this.readonly = !this.tenantService.isTenantManager() && !this.tenantService.isManager();

          const client = clients.find(client => client.id === clientMedia.client.id);
          if (client) {
            this.initialized = true;

            this.formGroup.setControl('client', this.formBuilder.control({value: client, disabled: this.readonly}, Validators.required), {emitEvent: false});
            this.formGroup.setControl('name', this.formBuilder.control({value: clientMedia.name, disabled: this.readonly}, Validators.required), {emitEvent: false});
            this.formGroup.setControl('platform', this.formBuilder.control({value: clientMedia.platform, disabled: this.readonly}, Validators.required), {emitEvent: false});
            this.formGroup.setControl('code', this.formBuilder.control({value: clientMedia.code, disabled: this.readonly}, null), {emitEvent: false});
            this.formGroup.setControl('secret', this.formBuilder.control({value: clientMedia.secret, disabled: this.readonly}, null), {emitEvent: false});
            this.formGroup.setControl('apppackage', this.formBuilder.control({value: clientMedia.apppackage, disabled: this.readonly}, null), {emitEvent: false});
            this.formGroup.setControl('appversion', this.formBuilder.control({value: clientMedia.appversion, disabled: this.readonly}, null), {emitEvent: false});
            this.formGroup.setControl('applink', this.formBuilder.control({value: clientMedia.applink, disabled: this.readonly}, null), {emitEvent: false});
            this.formGroup.setControl('remark', this.formBuilder.control({value: clientMedia.remark, disabled: this.readonly}, null), {emitEvent: false});
          }
        }
      }
    });
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

    const clientMedia: ClientMedia = {
      id: null,
      deleted: false,
      client: this.formGroup.value.client,
      name: this.formGroup.value.name,
      platform: this.formGroup.value.platform,
      code: this.formGroup.value.code,
      secret: this.formGroup.value.secret,
      apppackage: this.formGroup.value.apppackage,
      appversion: this.formGroup.value.appversion,
      applink: this.formGroup.value.applink,
      remark: this.formGroup.value.remark,
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
    if (!clientMedia) {
      return;
    }

    clientMedia.client = this.formGroup.value.client;
    clientMedia.name = this.formGroup.value.name;
    clientMedia.platform = this.formGroup.value.platform;
    clientMedia.code = this.formGroup.value.code;
    clientMedia.secret = this.formGroup.value.secret;
    clientMedia.apppackage = this.formGroup.value.apppackage;
    clientMedia.appversion = this.formGroup.value.appversion;
    clientMedia.applink = this.formGroup.value.applink;
    clientMedia.remark = this.formGroup.value.remark;

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
