import { Component, effect, input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UntypedFormGroup, UntypedFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxChange, MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatListModule } from '@angular/material/list';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';

import { Permission, Role, PermissionAPI, RoleAPI, ManagedResource } from '../../../core';

import { OperationComponent } from '../operation/operation.component';
import { GetRoleNamePipe } from '../../pipes/get-role-name.pipe';
import { GetUserNamePipe } from '../../pipes/get-user-name.pipe';

@Component({
  selector: 'carambola-permission',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatListModule,
    MatSelectModule,
    MatTableModule,
    GetUserNamePipe,
    GetRoleNamePipe,
    OperationComponent,
  ],
  templateUrl: './permission.component.html',
  styleUrls: ['./permission.component.scss'],
})
export class PermissionComponent implements OnInit {
  private formBuilder = inject(UntypedFormBuilder);
  private permissionAPI = inject(PermissionAPI);
  private roleAPI = inject(RoleAPI);
  private snackBar = inject(MatSnackBar);

  roles: Role[] = [];
  displayedColumns: string[] = ['roleId', 'permission'];

  itemPermissions: Permission[] = [];
  inheritedPermissions: Permission[] = [];
  itemPermissionMap: Map<number, Permission> = new Map<number, Permission>();
  inheritedPermissionMap: Map<number, Permission> = new Map<number, Permission>();
  itemPermissionRoleIds: number[] = [];

  formGroup: UntypedFormGroup;
  permissionFormGroup: UntypedFormGroup;

  inherited = false;
  inheritedPermissionId = 0;
  savingInherited = false;
  savingPermissionRoleIds: Set<number> = new Set<number>();

  item = input<ManagedResource | null>(null);
  itemType = input<string>('');

  /*
      Class Permission Rules

      resourceType    resourceId  role    permission  rule
      ------------    ----------  ----    ----------  ---------------------------------------
      T               null        R       P           R has P for class of T

      Item Permission Rules

      resourceType    resourceId  role    permission  rule
      ------------    ----------  ----    ----------  ---------------------------------------------------------------------
      T               I           null    null        I inherits permissions from it's parent (HierarchyManagedResource)
      T               I           null    null        I inherits permissions from it's container (ContainedManagedResource)
      T               I           R       P           R has P for I
  */

  constructor() {
    this.formGroup = this.formBuilder.group({
      'inherited': [false, null],
    });
    this.permissionFormGroup = this.formBuilder.group({
      'roleid': [0, null],
      'permission': ['', Validators.required],
    });

    effect(() => {
      const item = this.item();
      const itemType = this.itemType();

      this.inherited = false;
      this.inheritedPermissionId = 0;
      this.itemPermissions = [];
      this.inheritedPermissions = [];
      this.itemPermissionRoleIds = [];
      this.itemPermissionMap.clear();
      this.inheritedPermissionMap.clear();

      if (item && item.id && itemType) {
        this.permissionAPI.getItemPermissionList(itemType, item.id).subscribe(data => {
          this.itemPermissions = [...data];
          let inheritedPermissionIndex = -1;
          this.itemPermissions.forEach((permission, index) => {
            if (permission.permission === null && permission.id) {
              this.inherited = true;
              this.inheritedPermissionId = permission.id;
              inheritedPermissionIndex = index;
            }
          });
          if (this.inherited) {
            this.itemPermissions.splice(inheritedPermissionIndex, 1);
            this.permissionAPI.getInheritedPermissionList(itemType, item.id!).subscribe(data => {
              this.inheritedPermissions = data;

              for (const permission of this.itemPermissions) {
                this.itemPermissionMap.set(permission.roleId!, permission);
              }
              for (const permission of this.inheritedPermissions) {
                this.inheritedPermissionMap.set(permission.roleId!, permission);
              }

              this.itemPermissionRoleIds = [...this.itemPermissionMap.keys(), ...this.inheritedPermissionMap.keys()];
              this.itemPermissionRoleIds = Array.from(new Set(this.itemPermissionRoleIds)).sort((a, b) => {
                if (a < b) {
                  return -1;
                } else if (a > b) {
                  return 1;
                }
                return 0;
              });
            });
          } else {
            this.inheritedPermissions = [];

            for (const permission of this.itemPermissions) {
              this.itemPermissionMap.set(permission.roleId!, permission);
            }

            this.itemPermissionRoleIds = [...this.itemPermissionMap.keys()];
            this.itemPermissionRoleIds = Array.from(new Set(this.itemPermissionRoleIds)).sort((a, b) => {
              if (a < b) {
                return -1;
              } else if (a > b) {
                return 1;
              }
              return 0;
            });
          }

          this.formGroup.patchValue({
            'inherited': this.inherited,
          });

          this.permissionFormGroup.patchValue({
            'roleid': 0,
            'permission': '',
          });
        });
      }
    });
  }

  ngOnInit() {
    this.roleAPI.getRoleList().subscribe(data => {
      this.roles = data;
    });
  }

  toggleInherited(event: MatCheckboxChange) {
    const item = this.item();
    const itemType = this.itemType();
    const nextInherited = event.checked;

    event.source.checked = !nextInherited;
    this.formGroup.patchValue({
      'inherited': !nextInherited,
    }, {emitEvent: false});

    if (nextInherited && item && item.id && itemType) {
      const permission: Permission = {
        id: null,
        resourceType: itemType,
        resourceId: item.id,
        roleId: null,
        permission: null,
      }
      this.savingInherited = true;
      this.permissionAPI.addPermission(permission).subscribe({
        next: data => {
          this.inherited = true;
          this.inheritedPermissionId = data.id!;
          this.formGroup.patchValue({
            'inherited': true,
          }, {emitEvent: false});
          this.savingInherited = false;

          this.permissionAPI.getInheritedPermissionList(itemType, item.id!).subscribe(data => {
            this.inheritedPermissions = data;

            for (const permission of this.inheritedPermissions) {
              this.inheritedPermissionMap.set(permission.roleId!, permission);
            }

            this.itemPermissionRoleIds = [...this.itemPermissionMap.keys(), ...this.inheritedPermissionMap.keys()];
            this.itemPermissionRoleIds = Array.from(new Set(this.itemPermissionRoleIds)).sort((a, b) => {
              if (a < b) {
                return -1;
              } else if (a > b) {
                return 1;
              }
              return 0;
            });
          });
        },
        error: () => {
          this.savingInherited = false;
          this.snackBar.open('Permission update failed', 'OK', {
            duration: 3000,
          });
        },
      });
    } else {
      this.savingInherited = true;
      this.permissionAPI.removePermission(this.inheritedPermissionId).subscribe({
        next: () => {
          this.inherited = false;
          this.inheritedPermissionId = 0;
          this.inheritedPermissions = [];
          this.inheritedPermissionMap.clear();
          this.formGroup.patchValue({
            'inherited': false,
          }, {emitEvent: false});
          this.savingInherited = false;

          this.itemPermissionRoleIds = [...this.itemPermissionMap.keys()];
          this.itemPermissionRoleIds = Array.from(new Set(this.itemPermissionRoleIds)).sort((a, b) => {
            if (a < b) {
              return -1;
            } else if (a > b) {
              return 1;
            }
            return 0;
          });
        },
        error: () => {
          this.savingInherited = false;
          this.snackBar.open('Permission update failed', 'OK', {
            duration: 3000,
          });
        },
      });
    }
  }

  togglePermission(event: string | null, role: number) {
    let permissionIndex = -1;
    this.itemPermissions.forEach((permission, index) => {
      if (permission.roleId === role) {
        permissionIndex = index;
      }
    });

    if (event && event.length > 0) {
      if (permissionIndex >= 0) {
        const permission = this.itemPermissions[permissionIndex];
        this.setPermissionSaving(role, true);
        this.permissionAPI.updatePermission(permission.id!, {...permission, permission: event}).subscribe({
          next: () => {
            permission.permission = event;
            this.setPermissionSaving(role, false);
          },
          error: () => {
            this.setPermissionSaving(role, false);
            this.snackBar.open('Permission update failed', 'OK', {
              duration: 3000,
            });
          },
        });
      } else {
        const permission: Permission = {
          id: null,
          resourceType: this.itemType(),
          resourceId: this.item()!.id,
          roleId: role,
          permission: event,
        }
        this.setPermissionSaving(role, true);
        this.permissionAPI.addPermission(permission).subscribe({
          next: data => {
            this.itemPermissions.push(data);
            this.itemPermissionMap.set(role, data);
            this.setPermissionSaving(role, false);
            this.itemPermissionRoleIds = [...this.itemPermissionMap.keys(), ...this.inheritedPermissionMap.keys()];
            this.itemPermissionRoleIds = Array.from(new Set(this.itemPermissionRoleIds)).sort((a, b) => {
              if (a < b) {
                return -1;
              } else if (a > b) {
                return 1;
              }
              return 0;
            });
          },
          error: () => {
            this.setPermissionSaving(role, false);
            this.snackBar.open('Permission update failed', 'OK', {
              duration: 3000,
            });
          },
        });
      }
    } else {
      this.setPermissionSaving(role, true);
      this.permissionAPI.removePermission(this.itemPermissions[permissionIndex].id!).subscribe({
        next: () => {
          this.itemPermissions.splice(permissionIndex, 1);
          this.itemPermissionMap.delete(role);
          this.setPermissionSaving(role, false);
          this.itemPermissionRoleIds = [...this.itemPermissionMap.keys(), ...this.inheritedPermissionMap.keys()];
          this.itemPermissionRoleIds = Array.from(new Set(this.itemPermissionRoleIds)).sort((a, b) => {
            if (a < b) {
              return -1;
            } else if (a > b) {
              return 1;
            }
            return 0;
          });
        },
        error: () => {
          this.setPermissionSaving(role, false);
          this.snackBar.open('Permission update failed', 'OK', {
            duration: 3000,
          });
        },
      });
    }
  }

  isPermissionSaving(role: number) {
    return this.savingPermissionRoleIds.has(role);
  }

  preparePermission(event: string | null) {
    if (event && event.length > 0) {
      this.permissionFormGroup.patchValue({
        'permission': event,
      });
    }
  }

  addPermission() {
    const item = this.item();
    const itemType = this.itemType();

    if (item && item.id && itemType) {
      const permission: Permission = {
        id: null,
        resourceType: itemType,
        resourceId: item.id,
        roleId: this.permissionFormGroup.value.roleid,
        permission: this.permissionFormGroup.value.permission,
      }
      this.permissionAPI.addPermission(permission).subscribe(data => {
        this.itemPermissions.push(data);
        this.itemPermissionMap.set(this.permissionFormGroup.value.roleid, data);
        this.itemPermissionRoleIds = [...this.itemPermissionMap.keys(), ...this.inheritedPermissionMap.keys()];
        this.itemPermissionRoleIds = Array.from(new Set(this.itemPermissionRoleIds)).sort((a, b) => {
          if (a < b) {
            return -1;
          } else if (a > b) {
            return 1;
          }
          return 0;
        });
      });
    }
  }

  hasProperty(name: string) {
    return this.item() && Object.prototype.hasOwnProperty.call(this.item(), name);
  }

  getProperty(name: string) {
    return Object.getOwnPropertyDescriptor(this.item(), name)?.value;
  }

  private setPermissionSaving(role: number, saving: boolean) {
    if (saving) {
      this.savingPermissionRoleIds.add(role);
    } else {
      this.savingPermissionRoleIds.delete(role);
    }
  }

}
