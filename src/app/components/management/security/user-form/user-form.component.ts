import { ChangeDetectionStrategy, Component, effect, inject, input, OnInit, output, signal, WritableSignal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxChange, MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';

import { Role, RoleAPI, User, UserAPI } from '../../../../core';

type UserFormGroup = FormGroup<{
  username: FormControl<string>;
  password: FormControl<string>;
  enabled: FormControl<boolean>;
}>;

@Component({
  selector: 'carambola-user-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatTabsModule,
  ],
  templateUrl: './user-form.component.html',
  styleUrls: ['./user-form.component.scss'],
})
export class UserFormComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private roleAPI = inject(RoleAPI);
  private userAPI = inject(UserAPI);

  formGroup: UserFormGroup;

  roles: WritableSignal<Role[]> = signal([]);

  userRoleSet: WritableSignal<Set<Role>> = signal(new Set<Role>());

  displayedRoleColumns: string[] = ['name'];

  user = input<User | null>(null);
  changed = output<boolean>();

  constructor() {
    this.formGroup = this.formBuilder.group({
      username: this.formBuilder.nonNullable.control('', Validators.required),
      password: this.formBuilder.nonNullable.control('', Validators.required),
      enabled: this.formBuilder.nonNullable.control(true, Validators.required),
    });

    effect(() => {
      const user = this.user();
      this.formGroup = this.formBuilder.group({
        username: this.formBuilder.nonNullable.control(user ? user.username : '', Validators.required),
        password: this.formBuilder.nonNullable.control(user ? '********' : '', Validators.required),
        enabled: this.formBuilder.nonNullable.control(user ? user.enabled : true, Validators.required),
      });
    });

    effect(() => {
      const user = this.user();
      const roles = this.roles();

      const userRoleSet = new Set<Role>();
      if (!user) {
        this.userRoleSet.set(userRoleSet);
        return;
      }

      if (user.roles) {
        user.roles.forEach(role => {
          const matchedRole = roles.find(r => r.id === role.id);
          if (matchedRole) {
            userRoleSet.add(matchedRole);
          }
        });
      }
      this.userRoleSet.set(userRoleSet);
    });
  }

  ngOnInit() {
    this.roleAPI.getRoleList().subscribe(data => {
      this.roles.set(data);
    });
  }

  addUser() {
    if (!this.formGroup.valid) {
      this.formGroup.markAllAsTouched();
      return;
    }

    const user: User = {
      id: null,
      username: this.formGroup.controls.username.value,
      password: this.formGroup.controls.password.value,
      enabled: this.formGroup.controls.enabled.value,
      createTime: null,
      updateTime: null,
      roles: [],
    };

    this.userAPI.addUser(user).subscribe(() => {
      this.snackBar.open('User added', 'OK', {
        duration: 2000,
      });

      this.changed.emit(true);
    });
  }

  updateUser() {
    if (!this.formGroup.valid) {
      this.formGroup.markAllAsTouched();
      return;
    }

    const user = this.user();
    if (user) {
      user.username = this.formGroup.controls.username.value;
      if (this.formGroup.controls.password.touched) {
        user.password = this.formGroup.controls.password.value;
      } else {
        user.password = null;
      }
      user.enabled = this.formGroup.controls.enabled.value;

      this.userAPI.updateUser(user.id!, user).subscribe(() => {
        this.snackBar.open('User updated', 'OK', {
          duration: 2000,
        });

        this.changed.emit(true);
      });
    }
  }

  removeUser() {
    const user = this.user();
    if (user) {
      this.userAPI.removeUser(user.id!).subscribe(() => {
        this.snackBar.open('User removed', 'OK', {
          duration: 2000,
        });

        this.changed.emit(true);
      });
    }
  }

  cancelUser() {
    this.changed.emit(false);
  }

  touchPassword() {
    if (this.formGroup.controls.password.touched) {
      return;
    }

    this.formGroup.controls.password.setValue('');
  }

  toggleRole(role: Role, event: MatCheckboxChange) {
    const user = this.user();

    if (user) {
      if (event.checked) {
        user.roles.push(role);
        this.userRoleSet.update(roles => {
          const nextRoles = new Set(roles);
          nextRoles.add(role);
          return nextRoles;
        });
      } else {
        const index = user.roles.findIndex(r => r.id === role.id);
        if (index >= 0) {
          user.roles.splice(index, 1);
        }
        this.userRoleSet.update(roles => {
          const nextRoles = new Set(roles);
          nextRoles.delete(role);
          return nextRoles;
        });
      }

      this.userAPI.updateUser(user.id!, user).subscribe();
    }
  }

}
