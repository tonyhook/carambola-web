import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { AuthService } from '../../../services';

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
  private formBuilder = inject(UntypedFormBuilder);

  hide = true;
  formGroup: UntypedFormGroup;

  constructor() {
    this.formGroup = this.formBuilder.group({
      'username': [null, Validators.required],
      'password': [null, Validators.required],
      'rememberMe': [null, null],
    });
  }

  login() {
    if (this.formGroup.valid) {
      this.authService.login(this.formGroup.value);
    }
  }

}
