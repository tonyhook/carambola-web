import { Component, inject } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { UserAPI } from '../../../core';
import { AuthService } from '../../../services';

type MeFormGroup = FormGroup<{
  password: FormControl<string>;
}>;

@Component({
  selector: 'carambola-admin-me',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './me.component.html',
  styleUrls: ['./me.component.scss'],
})
export class MeComponent {
  private userAPI = inject(UserAPI);
  private authService = inject(AuthService);
  private formBuilder = inject(FormBuilder);

  formGroup: MeFormGroup;

  constructor() {
    this.formGroup = this.formBuilder.group({
      password: this.formBuilder.nonNullable.control('', Validators.required),
    });
  }

  updatePassword() {
    if (!this.formGroup.valid) {
      this.formGroup.markAllAsTouched();
      return;
    }

    this.userAPI.updatePassword(this.formGroup.controls.password.value).subscribe(() => {
      this.authService.logout();
    });
  }

}
