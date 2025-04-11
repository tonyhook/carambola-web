import { Component, effect, input, output } from '@angular/core';
import { UntypedFormGroup, UntypedFormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';

import { Authority, AuthorityAPI } from '../../../../core';

@Component({
  selector: 'carambola-authority-form',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatTabsModule,
  ],
  templateUrl: './authority-form.component.html',
  styleUrls: ['./authority-form.component.scss'],
})
export class AuthorityFormComponent {
  formGroup: UntypedFormGroup;

  authority = input<Authority | null>(null);
  changed = output<boolean>();

  constructor(
    private formBuilder: UntypedFormBuilder,
    private snackBar: MatSnackBar,
    private authorityAPI: AuthorityAPI,
  ) {
    this.formGroup = this.formBuilder.group({
      'name': ['', Validators.required],
    });

    effect(() => {
      const authority = this.authority();
      this.formGroup = this.formBuilder.group({
        'name': [authority ? authority.name : '', Validators.required],
      });
    });
  }

  addAuthority() {
    if (!this.formGroup.valid) {
      this.formGroup.markAllAsTouched();
      return;
    }

    const authority: Authority = {
      id: null,
      name: this.formGroup.value.name,
      createTime: null,
      updateTime: null,
    };

    this.authorityAPI.addAuthority(authority).subscribe(() => {
      this.snackBar.open('Authority added', 'OK', {
        duration: 2000,
      });

      this.changed.emit(true);
    });
  }

  updateAuthority() {
    if (!this.formGroup.valid) {
      this.formGroup.markAllAsTouched();
      return;
    }

    const authority = this.authority();
    if (authority) {
      authority.name = this.formGroup.value.name;

      this.authorityAPI.updateAuthority(authority.id!, authority).subscribe(() => {
        this.snackBar.open('Authority updated', 'OK', {
          duration: 2000,
        });

        this.changed.emit(true);
      });
    }
  }

  removeAuthority() {
    const authority = this.authority();
    if (authority) {
      this.authorityAPI.removeAuthority(authority.id!).subscribe(() => {
        this.snackBar.open('Authority removed', 'OK', {
          duration: 2000,
        });

        this.changed.emit(true);
      });
    }
  }

  cancelAuthority() {
    this.changed.emit(false);
  }

}
