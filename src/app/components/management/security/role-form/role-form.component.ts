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

import { Authority, AuthorityAPI, Permission, PermissionAPI, Role, RoleAPI } from '../../../../core';
import { OperationComponent } from '../../../../shared/components/operation/operation.component';

@Component({
  selector: 'carambola-role-form',
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
  private formBuilder = inject(UntypedFormBuilder);
  private snackBar = inject(MatSnackBar);
  private permissionAPI = inject(PermissionAPI);
  private authorityAPI = inject(AuthorityAPI);
  private roleAPI = inject(RoleAPI);

  formGroup: UntypedFormGroup;

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
      'name': ['', Validators.required],
    });

    effect(() => {
      const role = this.role();
      this.formGroup = this.formBuilder.group({
        'name': [role ? role.name : '', Validators.required],
      });
    });

    effect(() => {
      const role = this.role();
      const authorities = this.authorities();
      const resourcesTypes = this.resourcesTypes();

      const roleAuthoritySet = new Set<Authority>();
      const rolePermissionMap = new Map<string, Permission>();
      if (role) {
        if (role.authorities) {
          role.authorities.forEach(authority => {
            roleAuthoritySet.add(authorities.find(a => a.id === authority.id)!);
          });
        }
        this.roleAuthoritySet.set(roleAuthoritySet);

        resourcesTypes.forEach(resourceType => {
          this.permissionAPI.getClassPermissionList(resourceType).subscribe(permissions => {
            for (const permission of permissions) {
              if (permission.roleId === role.id) {
                rolePermissionMap.set(resourceType, permission);
              }
            }
          });
        });
        this.rolePermissionMap.set(rolePermissionMap);
      }
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
      name: this.formGroup.value.name,
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
      role.name = this.formGroup.value.name;

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
      } else {
        const index = role.authorities.findIndex(a => a.id === authority.id);
        role.authorities.splice(index, 1);
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
          rolePermissionMap.set(resourceType, data);
          this.rolePermissionMap.set(rolePermissionMap);
        });
      } else {
        if (!newOp || newOp.length === 0) {
          this.permissionAPI.removePermission(permission.id!).subscribe(() => {
            rolePermissionMap.delete(resourceType);
            this.rolePermissionMap.set(rolePermissionMap);
          });
        } else {
          permission.permission = newOp;
          this.permissionAPI.updatePermission(permission.id!, permission).subscribe(() => {
            this.rolePermissionMap.set(rolePermissionMap);
          });
        }
      }
    }
  }

}
