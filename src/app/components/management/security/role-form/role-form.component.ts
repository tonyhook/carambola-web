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
import { forkJoin } from 'rxjs';

import { Authority, AuthorityAPI, Permission, PermissionAPI, Role, RoleAPI } from '../../../../core';
import { OperationComponent } from '../../../../shared/components/operation/operation.component';

type RoleFormGroup = FormGroup<{
  name: FormControl<string>;
}>;

@Component({
  selector: 'carambola-role-form',
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
    OperationComponent
  ],
  templateUrl: './role-form.component.html',
  styleUrls: ['./role-form.component.scss'],
})
export class RoleFormComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private permissionAPI = inject(PermissionAPI);
  private authorityAPI = inject(AuthorityAPI);
  private roleAPI = inject(RoleAPI);

  formGroup: RoleFormGroup;

  authorities: WritableSignal<Authority[]> = signal([]);
  resourcesTypes: WritableSignal<string[]> = signal([]);

  roleAuthoritySet: WritableSignal<Set<Authority>> = signal(new Set<Authority>());
  rolePermissionMap: WritableSignal<Map<string, Permission>> = signal(new Map<string, Permission>());

  displayedAuthorityColumns: string[] = ['name'];
  displayedResourceTypeColumns: string[] = ['type', 'permission'];

  role = input<Role | null>(null);
  changed = output<boolean>();

  constructor() {
    this.formGroup = this.formBuilder.group({
      name: this.formBuilder.nonNullable.control('', Validators.required),
    });

    effect(() => {
      const role = this.role();
      this.formGroup = this.formBuilder.group({
        name: this.formBuilder.nonNullable.control(role ? role.name : '', Validators.required),
      });
    });

    effect((onCleanup) => {
      const role = this.role();
      const authorities = this.authorities();
      const resourcesTypes = this.resourcesTypes();

      const roleAuthoritySet = new Set<Authority>();
      const rolePermissionMap = new Map<string, Permission>();

      if (!role) {
        this.roleAuthoritySet.set(roleAuthoritySet);
        this.rolePermissionMap.set(rolePermissionMap);
        return;
      }

      if (role.authorities) {
        role.authorities.forEach(authority => {
          const matchedAuthority = authorities.find(a => a.id === authority.id);
          if (matchedAuthority) {
            roleAuthoritySet.add(matchedAuthority);
          }
        });
      }
      this.roleAuthoritySet.set(roleAuthoritySet);
      this.rolePermissionMap.set(rolePermissionMap);

      if (resourcesTypes.length === 0) {
        return;
      }

      const roleId = role.id;
      const subscription = forkJoin(resourcesTypes.map(resourceType => this.permissionAPI.getClassPermissionList(resourceType))).subscribe(permissionLists => {
        if (this.role()?.id !== roleId) {
          return;
        }

        const nextRolePermissionMap = new Map<string, Permission>();
        permissionLists.forEach((permissions, index) => {
          const permission = permissions.find(p => p.roleId === roleId);
          if (permission) {
            nextRolePermissionMap.set(resourcesTypes[index], permission);
          }
        });
        this.rolePermissionMap.set(nextRolePermissionMap);
      });

      onCleanup(() => subscription.unsubscribe());
    });
  }

  ngOnInit() {
    this.authorityAPI.getAuthorityList().subscribe(data => {
      this.authorities.set(data);
    });
    this.permissionAPI.getResourceTypeList().subscribe(data => {
      this.resourcesTypes.set(data);
    });
  }

  addRole() {
    if (!this.formGroup.valid) {
      this.formGroup.markAllAsTouched();
      return;
    }

    const role: Role = {
      id: null,
      name: this.formGroup.controls.name.value,
      createTime: null,
      updateTime: null,
      authorities: [],
    };

    this.roleAPI.addRole(role).subscribe(() => {
      this.snackBar.open('Role added', 'OK', {
        duration: 2000,
      });

      this.changed.emit(true);
    });
  }

  updateRole() {
    if (!this.formGroup.valid) {
      this.formGroup.markAllAsTouched();
      return;
    }

    const role = this.role();
    if (role) {
      role.name = this.formGroup.controls.name.value;

      this.roleAPI.updateRole(role.id!, role).subscribe(() => {
        this.snackBar.open('Role updated', 'OK', {
          duration: 2000,
        });

        this.changed.emit(true);
      });
    }
  }

  removeRole() {
    const role = this.role();
    if (role) {
      this.roleAPI.removeRole(role.id!).subscribe(() => {
        this.snackBar.open('Role removed', 'OK', {
          duration: 2000,
        });

        this.changed.emit(true);
      });
  }
  }

  cancelRole() {
    this.changed.emit(false);
  }

  toggleAuthority(authority: Authority, event: MatCheckboxChange) {
    const role = this.role();

    if (role) {
      if (event.checked) {
        role.authorities.push(authority);
        this.roleAuthoritySet.update(authorities => {
          const nextAuthorities = new Set(authorities);
          nextAuthorities.add(authority);
          return nextAuthorities;
        });
      } else {
        const index = role.authorities.findIndex(a => a.id === authority.id);
        if (index >= 0) {
          role.authorities.splice(index, 1);
        }
        this.roleAuthoritySet.update(authorities => {
          const nextAuthorities = new Set(authorities);
          nextAuthorities.delete(authority);
          return nextAuthorities;
        });
      }

      this.roleAPI.updateRole(role.id!, role).subscribe();
    }
  }

  getPermission(resourceType: string) {
    const rolePermissionMap = this.rolePermissionMap();
    const permission = rolePermissionMap.get(resourceType);
    if (permission) {
      return permission.permission;
    } else {
      return '';
    }
  }

  togglePermission(resourceType: string, newOp: string | null) {
    const role = this.role();
    if (role) {
      const rolePermissionMap = this.rolePermissionMap();
      let permission = rolePermissionMap.get(resourceType);

      if (!permission) {
        permission = {
          id: null,
          resourceType: resourceType,
          resourceId: null,
          roleId: role.id,
          permission: newOp,
        };

        this.permissionAPI.addPermission(permission).subscribe(data => {
          this.rolePermissionMap.update(rolePermissionMap => {
            const nextRolePermissionMap = new Map(rolePermissionMap);
            nextRolePermissionMap.set(resourceType, data);
            return nextRolePermissionMap;
          });
        });
      } else {
        if (!newOp || newOp.length === 0) {
          this.permissionAPI.removePermission(permission.id!).subscribe(() => {
            this.rolePermissionMap.update(rolePermissionMap => {
              const nextRolePermissionMap = new Map(rolePermissionMap);
              nextRolePermissionMap.delete(resourceType);
              return nextRolePermissionMap;
            });
          });
        } else {
          permission.permission = newOp;
          this.permissionAPI.updatePermission(permission.id!, permission).subscribe(() => {
            this.rolePermissionMap.update(rolePermissionMap => new Map(rolePermissionMap));
          });
        }
      }
    }
  }

}
