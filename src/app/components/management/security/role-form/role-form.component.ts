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
  savingAuthorityIds: WritableSignal<Set<number>> = signal(new Set<number>());
  savingPermissionResourceTypes: WritableSignal<Set<string>> = signal(new Set<string>());
  selectedIndex = signal(0);

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

  closeRole() {
    this.changed.emit(true);
  }

  toggleAuthority(authority: Authority, event: MatCheckboxChange) {
    const role = this.role();

    if (!role || authority.id === null) {
      return;
    }

    const nextAuthorities = event.checked ? [...role.authorities, authority] : role.authorities.filter(a => a.id !== authority.id);
    const nextRole = {
      ...role,
      authorities: nextAuthorities,
    };

    event.source.checked = !event.checked;
    this.setAuthoritySaving(authority.id, true);

    this.roleAPI.updateRole(role.id!, nextRole).subscribe({
      next: () => {
        role.authorities = nextAuthorities;
        this.setRoleAuthorityChecked(authority, event.checked);
        this.setAuthoritySaving(authority.id!, false);
      },
      error: () => {
        this.setAuthoritySaving(authority.id!, false);
        this.snackBar.open('Authority update failed', 'OK', {
          duration: 3000,
        });
      },
    });
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
      const permission = rolePermissionMap.get(resourceType);

      if (!permission) {
        if (!newOp || newOp.length === 0) {
          return;
        }

        const nextPermission = {
          id: null,
          resourceType: resourceType,
          resourceId: null,
          roleId: role.id,
          permission: newOp,
        };

        this.setPermissionSaving(resourceType, true);

        this.permissionAPI.addPermission(nextPermission).subscribe({
          next: data => {
            this.setPermissionInMap(resourceType, data);
            this.setPermissionSaving(resourceType, false);
          },
          error: () => {
            this.setPermissionSaving(resourceType, false);
            this.snackBar.open('Permission update failed', 'OK', {
              duration: 3000,
            });
          },
        });
      } else {
        if (!newOp || newOp.length === 0) {
          this.setPermissionSaving(resourceType, true);

          this.permissionAPI.removePermission(permission.id!).subscribe({
            next: () => {
              this.removePermissionFromMap(resourceType);
              this.setPermissionSaving(resourceType, false);
            },
            error: () => {
              this.setPermissionSaving(resourceType, false);
              this.snackBar.open('Permission update failed', 'OK', {
                duration: 3000,
              });
            },
          });
        } else {
          const nextPermission = {
            ...permission,
            permission: newOp,
          };

          this.setPermissionSaving(resourceType, true);

          this.permissionAPI.updatePermission(permission.id!, nextPermission).subscribe({
            next: () => {
              this.setPermissionInMap(resourceType, nextPermission);
              this.setPermissionSaving(resourceType, false);
            },
            error: () => {
              this.setPermissionSaving(resourceType, false);
              this.snackBar.open('Permission update failed', 'OK', {
                duration: 3000,
              });
            },
          });
        }
      }
    }
  }

  isAuthoritySaving(authority: Authority) {
    return authority.id !== null && this.savingAuthorityIds().has(authority.id);
  }

  isPermissionSaving(resourceType: string) {
    return this.savingPermissionResourceTypes().has(resourceType);
  }

  isPropertiesTab() {
    return this.selectedIndex() === 0;
  }

  private setAuthoritySaving(authorityId: number, saving: boolean) {
    this.savingAuthorityIds.update(authorityIds => {
      const nextAuthorityIds = new Set(authorityIds);
      if (saving) {
        nextAuthorityIds.add(authorityId);
      } else {
        nextAuthorityIds.delete(authorityId);
      }
      return nextAuthorityIds;
    });
  }

  private setPermissionSaving(resourceType: string, saving: boolean) {
    this.savingPermissionResourceTypes.update(resourceTypes => {
      const nextResourceTypes = new Set(resourceTypes);
      if (saving) {
        nextResourceTypes.add(resourceType);
      } else {
        nextResourceTypes.delete(resourceType);
      }
      return nextResourceTypes;
    });
  }

  private setRoleAuthorityChecked(authority: Authority, checked: boolean) {
    this.roleAuthoritySet.update(authorities => {
      const nextAuthorities = new Set(authorities);
      if (checked) {
        nextAuthorities.add(authority);
      } else {
        nextAuthorities.delete(authority);
      }
      return nextAuthorities;
    });
  }

  private setPermissionInMap(resourceType: string, permission: Permission) {
    this.rolePermissionMap.update(rolePermissionMap => {
      const nextRolePermissionMap = new Map(rolePermissionMap);
      nextRolePermissionMap.set(resourceType, permission);
      return nextRolePermissionMap;
    });
  }

  private removePermissionFromMap(resourceType: string) {
    this.rolePermissionMap.update(rolePermissionMap => {
      const nextRolePermissionMap = new Map(rolePermissionMap);
      nextRolePermissionMap.delete(resourceType);
      return nextRolePermissionMap;
    });
  }

}
