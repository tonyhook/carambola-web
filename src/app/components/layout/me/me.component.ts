import { Component } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { UserAPI } from '../../../core';
import { AuthService } from '../../../services';

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
  formGroup: UntypedFormGroup;

  constructor(
    private userAPI: UserAPI,
    private authService: AuthService,
    private formBuilder: UntypedFormBuilder,
  ) {
    this.formGroup = this.formBuilder.group({
      'password': ['', Validators.required],
    });
  }

  updatePassword() {
    if (!this.formGroup.valid) {
      this.formGroup.markAllAsTouched();
      return;
    }

    this.userAPI.updatePassword(this.formGroup.value.password).subscribe(() => {
      this.authService.logout();
    });
  }

}
