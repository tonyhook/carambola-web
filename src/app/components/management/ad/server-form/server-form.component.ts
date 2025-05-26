import { Component, effect, input, output } from '@angular/core';
import { UntypedFormGroup, UntypedFormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';

import { Server, ServerAPI } from '../../../../core';

@Component({
  selector: 'carambola-server-form',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
    MatTabsModule,
  ],
  templateUrl: './server-form.component.html',
  styleUrls: ['./server-form.component.scss'],
})
export class ServerFormComponent {
  formGroup: UntypedFormGroup;

  server = input<Server | null>(null);
  changed = output<boolean>();

  constructor(
    private formBuilder: UntypedFormBuilder,
    private snackBar: MatSnackBar,
    private serverAPI: ServerAPI,
  ) {
    this.formGroup = this.formBuilder.group({
      'domain': ['', null],
      'address': ['', Validators.required],
      'node': ['', Validators.required],
      'username': ['', Validators.required],
      'password': ['', Validators.required],
    });

    effect(() => {
      const server = this.server();

      if (!server) {
        this.formGroup.setControl('domain', this.formBuilder.control('', null), {emitEvent: false});
        this.formGroup.setControl('address', this.formBuilder.control('', Validators.required), {emitEvent: false});
        this.formGroup.setControl('node', this.formBuilder.control('', Validators.required), {emitEvent: false});
        this.formGroup.setControl('username', this.formBuilder.control('', Validators.required), {emitEvent: false});
        this.formGroup.setControl('password', this.formBuilder.control('', Validators.required), {emitEvent: false});
      } else {
        this.formGroup.setControl('domain', this.formBuilder.control(server.domain, null), {emitEvent: false});
        this.formGroup.setControl('address', this.formBuilder.control(server.address, Validators.required), {emitEvent: false});
        this.formGroup.setControl('node', this.formBuilder.control(server.node, Validators.required), {emitEvent: false});
        this.formGroup.setControl('username', this.formBuilder.control(server.username, Validators.required), {emitEvent: false});
        this.formGroup.setControl('password', this.formBuilder.control(server.password, Validators.required), {emitEvent: false});
      }
    });
  }

  addServer() {
    if (!this.formGroup.valid) {
      this.formGroup.markAllAsTouched();
      return;
    }

    const server: Server = {
      id: null,
      domain: this.formGroup.value.domain,
      address: this.formGroup.value.address,
      node: this.formGroup.value.node,
      username: this.formGroup.value.username,
      password: this.formGroup.value.password,
    };

    this.serverAPI.addServer(server).subscribe(() => {
      this.snackBar.open('服务器已创建', 'OK', {
        duration: 2000,
      });

      this.changed.emit(true);
    });
  }

  updateServer() {
    if (!this.formGroup.valid) {
      this.formGroup.markAllAsTouched();
      return;
    }

    const server = this.server();
    if (!server) {
      return;
    }

    server.domain = this.formGroup.value.domain;
    server.address = this.formGroup.value.address;
    server.node = this.formGroup.value.node;
    server.username = this.formGroup.value.username;
    server.password = this.formGroup.value.password;

    this.serverAPI.updateServer(server.id!, server).subscribe(() => {
      this.snackBar.open('服务器已修改', 'OK', {
        duration: 2000,
      });

      this.changed.emit(true);
    });
}

  removeServer() {
    const server = this.server();
    if (server) {
      this.serverAPI.removeServer(server.id!).subscribe(() => {
        this.snackBar.open('服务器已删除', 'OK', {
          duration: 2000,
        });

        this.changed.emit(true);
      });
    }
  }

  cancelServer() {
    this.changed.emit(false);
  }

}
