import { Component, effect, input, OnInit, output, signal, WritableSignal, inject } from '@angular/core';
import { UntypedFormGroup, UntypedFormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxChange, MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';

import { Role, RoleAPI, User, UserAPI } from '../../../../core';

@Component({
  selector: 'carambola-user-form',
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
  private formBuilder = inject(UntypedFormBuilder);
  private snackBar = inject(MatSnackBar);
  private roleAPI = inject(RoleAPI);
  private userAPI = inject(UserAPI);

  formGroup: UntypedFormGroup;

  roles: WritableSignal<Role[]> = signal([]);

  userRoleSet: WritableSignal<Set<Role>> = signal(new Set<Role>());

  displayedRoleColumns: string[] = ['name'];

  user = input<User | null>(null);
  changed = output<boolean>();

  constructor() {
    this.formGroup = this.formBuilder.group({
      'username': ['', Validators.required],
      'password': ['', Validators.required],
      'enabled': [true, Validators.required],
    });

    effect(() => {
      const user = this.user();
      this.formGroup = this.formBuilder.group({
        'username': [user ? user.username : '', Validators.required],
        'password': [user ? '********' : '', Validators.required],
        'enabled': [user ? user.enabled : true, Validators.required],
      });
    });

    effect(() => {
      const user = this.user();
      const roles = this.roles();

      const userRoleSet = new Set<Role>();
      if (user) {
        if (user.roles) {
          user.roles.forEach(role => {
            userRoleSet.add(roles.find(r => r.id === role.id)!);
          });
        }
        this.userRoleSet.set(userRoleSet);
      }
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
      username: this.formGroup.value.username,
      password: this.formGroup.value.password,
      enabled: this.formGroup.value.enabled,
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
      user.username = this.formGroup.value.username;
      if (this.formGroup.controls['password'].touched) {
        user.password = this.formGroup.value.password;
      } else {
        user.password = null;
      }
      user.enabled = this.formGroup.value.enabled;

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
    if (this.formGroup.controls['password'].touched) {
      return;
    }

    this.formGroup.controls['password'].setValue('');
  }

  toggleRole(role: Role, event: MatCheckboxChange) {
    const user = this.user();

    if (user) {
      if (event.checked) {
        user.roles.push(role);
      } else {
        const index = user.roles.findIndex(r => r.id === role.id);
        user.roles.splice(index, 1);
      }

      this.userAPI.updateUser(user.id!, user).subscribe();
    }
  }

}
