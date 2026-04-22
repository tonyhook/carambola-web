import { Component, effect, input, output, inject } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';

import { Server, ServerAPI } from '../../../../core';

interface ServerFormControls {
  domain: FormControl<string>;
  address: FormControl<string>;
  node: FormControl<number | null>;
  username: FormControl<string>;
  password: FormControl<string>;
}

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
  private formBuilder = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private serverAPI = inject(ServerAPI);

  formGroup: FormGroup<ServerFormControls>;

  server = input<Server | null>(null);
  changed = output<boolean>();

  constructor() {
    this.formGroup = this.formBuilder.group({
      domain: this.formBuilder.nonNullable.control(''),
      address: this.formBuilder.nonNullable.control('', Validators.required),
      node: this.formBuilder.control<number | null>(null, Validators.required),
      username: this.formBuilder.nonNullable.control('', Validators.required),
      password: this.formBuilder.nonNullable.control('', Validators.required),
    });

    effect(() => {
      const server = this.server();

      if (!server) {
        this.formGroup.setControl('domain', this.createOptionalTextControl(''), {emitEvent: false});
        this.formGroup.setControl('address', this.createRequiredTextControl(''), {emitEvent: false});
        this.formGroup.setControl('node', this.createNodeControl(null), {emitEvent: false});
        this.formGroup.setControl('username', this.createRequiredTextControl(''), {emitEvent: false});
        this.formGroup.setControl('password', this.createRequiredTextControl(''), {emitEvent: false});
      } else {
        this.formGroup.setControl('domain', this.createOptionalTextControl(server.domain), {emitEvent: false});
        this.formGroup.setControl('address', this.createRequiredTextControl(server.address), {emitEvent: false});
        this.formGroup.setControl('node', this.createNodeControl(server.node), {emitEvent: false});
        this.formGroup.setControl('username', this.createRequiredTextControl(server.username), {emitEvent: false});
        this.formGroup.setControl('password', this.createRequiredTextControl(server.password), {emitEvent: false});
      }
    });
  }

  private createOptionalTextControl(value: string): FormControl<string> {
    return this.formBuilder.nonNullable.control(value);
  }

  private createRequiredTextControl(value: string): FormControl<string> {
    return this.formBuilder.nonNullable.control(value, Validators.required);
  }

  private createNodeControl(value: number | null): FormControl<number | null> {
    return this.formBuilder.control<number | null>(value, Validators.required);
  }

  addServer() {
    if (!this.formGroup.valid) {
      this.formGroup.markAllAsTouched();
      return;
    }

    const server: Server = {
      id: null,
      domain: this.formGroup.controls.domain.value,
      address: this.formGroup.controls.address.value,
      node: this.formGroup.controls.node.value!,
      username: this.formGroup.controls.username.value,
      password: this.formGroup.controls.password.value,
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

    server.domain = this.formGroup.controls.domain.value;
    server.address = this.formGroup.controls.address.value;
    server.node = this.formGroup.controls.node.value!;
    server.username = this.formGroup.controls.username.value;
    server.password = this.formGroup.controls.password.value;

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
