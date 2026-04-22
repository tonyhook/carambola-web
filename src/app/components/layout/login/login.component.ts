import { Component, inject } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { AuthService } from '../../../services';

type LoginFormGroup = FormGroup<{
  username: FormControl<string>;
  password: FormControl<string>;
  rememberMe: FormControl<string>;
}>;

@Component({
  selector: 'carambola-admin-login',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  private authService = inject(AuthService);
  private formBuilder = inject(FormBuilder);

  hide = true;
  formGroup: LoginFormGroup;

  constructor() {
    this.formGroup = this.formBuilder.group({
      username: this.formBuilder.nonNullable.control('', Validators.required),
      password: this.formBuilder.nonNullable.control('', Validators.required),
      rememberMe: this.formBuilder.nonNullable.control('false'),
    });
  }

  login() {
    if (this.formGroup.valid) {
      this.authService.login({
        username: this.formGroup.controls.username.value,
        password: this.formGroup.controls.password.value,
        rememberMe: this.formGroup.controls.rememberMe.value,
      });
    }
  }

}
