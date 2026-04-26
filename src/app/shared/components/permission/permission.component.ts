import { ChangeDetectionStrategy, Component, effect, inject, input, OnInit, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatListModule } from '@angular/material/list';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';

import { ManagedResource, Permission, PermissionAPI, Role, RoleAPI, UserAPI } from '../../../core';
import { OperationComponent } from '../operation/operation.component';

type PermissionInheritedFormGroup = FormGroup<{
  inherited: FormControl<boolean>;
}>;

type PermissionEditorFormGroup = FormGroup<{
  roleid: FormControl<number>;
  permission: FormControl<string>;
}>;

@Component({
  selector: 'carambola-permission',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatListModule,
    MatSelectModule,
    MatTableModule,
    OperationComponent,
  ],
  templateUrl: './permission.component.html',
  styleUrls: ['./permission.component.scss'],
})
export class PermissionComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private permissionAPI = inject(PermissionAPI);
  private roleAPI = inject(RoleAPI);
  private userAPI = inject(UserAPI);

  roles = signal<Role[]>([]);
  roleNameMap = signal(new Map<number, string>());
  displayedColumns: string[] = ['roleId', 'permission'];

  itemPermissions = signal<Permission[]>([]);
  inheritedPermissions = signal<Permission[]>([]);
  itemPermissionMap = signal(new Map<number, Permission>());
  inheritedPermissionMap = signal(new Map<number, Permission>());
  itemPermissionRoleIds = signal<number[]>([]);

  formGroup: PermissionInheritedFormGroup;
  permissionFormGroup: PermissionEditorFormGroup;

  inherited = signal(false);
  inheritedPermissionId = signal(0);
  ownerName = signal('');

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
      inherited: this.formBuilder.nonNullable.control(false),
    });
    this.permissionFormGroup = this.formBuilder.group({
      roleid: this.formBuilder.nonNullable.control(0),
      permission: this.formBuilder.nonNullable.control('', Validators.required),
    });

    effect((onCleanup) => {
      const item = this.item();
      const itemType = this.itemType();
      let active = true;

      this.ownerName.set('');
      this.inherited.set(false);
      this.inheritedPermissionId.set(0);
      this.itemPermissions.set([]);
      this.inheritedPermissions.set([]);
      this.itemPermissionRoleIds.set([]);
      this.itemPermissionMap.set(new Map());
      this.inheritedPermissionMap.set(new Map());

      if (item && item.id && itemType) {
        const itemId = item.id;

        if (item.ownerId !== undefined && item.ownerId !== null) {
          const ownerId = item.ownerId;

          this.userAPI.getUser(ownerId).subscribe(user => {
            if (active && this.item()?.ownerId === ownerId) {
              this.ownerName.set(user.username);
            }
          });
        }

        this.permissionAPI.getItemPermissionList(itemType, itemId).subscribe(data => {
          if (!active || this.item()?.id !== itemId || this.itemType() !== itemType) {
            return;
          }

          const itemPermissions = [...data];
          let inherited = false;
          let inheritedPermissionId = 0;
          let inheritedPermissionIndex = -1;
          itemPermissions.forEach((permission, index) => {
            if (permission.permission === null && permission.id) {
              inherited = true;
              inheritedPermissionId = permission.id;
              inheritedPermissionIndex = index;
            }
          });

          this.inherited.set(inherited);
          this.inheritedPermissionId.set(inheritedPermissionId);
          if (inherited) {
            itemPermissions.splice(inheritedPermissionIndex, 1);
          }
          this.itemPermissions.set(itemPermissions);

          if (inherited) {
            this.permissionAPI.getInheritedPermissionList(itemType, itemId).subscribe(data => {
              if (!active || this.item()?.id !== itemId || this.itemType() !== itemType) {
                return;
              }

              this.inheritedPermissions.set(data);
              this.itemPermissionMap.set(new Map(itemPermissions.map(permission => [permission.roleId!, permission])));
              this.inheritedPermissionMap.set(new Map(data.map(permission => [permission.roleId!, permission])));
              this.updatePermissionRoleIds();
            });
          } else {
            this.inheritedPermissions.set([]);
            this.itemPermissionMap.set(new Map(itemPermissions.map(permission => [permission.roleId!, permission])));
            this.inheritedPermissionMap.set(new Map());
            this.updatePermissionRoleIds();
          }

          this.formGroup.patchValue({
            inherited,
          });

          this.permissionFormGroup.patchValue({
            roleid: 0,
            permission: '',
          });
        });
      }

      onCleanup(() => {
        active = false;
      });
    });
  }

  ngOnInit() {
    this.roleAPI.getRoleList().subscribe(data => {
      this.roles.set(data);
      this.roleNameMap.set(new Map<number, string>(data.map(role => [role.id!, role.name])));
    });
  }

  getRoleName(roleId: number): string {
    return this.roleNameMap().get(roleId) ?? String(roleId);
  }

  toggleInherited() {
    const item = this.item();
    const itemType = this.itemType();

    this.inherited.set(this.formGroup.controls.inherited.value);
    if (this.inherited() && item && item.id && itemType) {
      const permission: Permission = {
        id: null,
        resourceType: itemType,
        resourceId: item.id,
        roleId: null,
        permission: null,
      }
      this.permissionAPI.addPermission(permission).subscribe(data => {
        this.inherited.set(true);
        this.inheritedPermissionId.set(data.id!);

        this.permissionAPI.getInheritedPermissionList(itemType, item.id!).subscribe(data => {
          this.inheritedPermissions.set(data);
          this.inheritedPermissionMap.set(new Map(data.map(permission => [permission.roleId!, permission])));
          this.updatePermissionRoleIds();
        });
      });
    } else {
      this.permissionAPI.removePermission(this.inheritedPermissionId()).subscribe(() => {
        this.inherited.set(false);
        this.inheritedPermissionId.set(0);
        this.inheritedPermissions.set([]);
        this.inheritedPermissionMap.set(new Map());
        this.updatePermissionRoleIds();
      });
    }
  }

  togglePermission(event: string | null, role: number) {
    let permissionIndex = -1;
    const itemPermissions = this.itemPermissions();
    itemPermissions.forEach((permission, index) => {
      if (permission.roleId === role) {
        permissionIndex = index;
      }
    });

    if (event && event.length > 0) {
      if (permissionIndex >= 0) {
        const nextPermission = {...itemPermissions[permissionIndex], permission: event};
        this.permissionAPI.updatePermission(nextPermission.id!, nextPermission).subscribe(() => {
          const nextItemPermissions = [...this.itemPermissions()];
          nextItemPermissions[permissionIndex] = nextPermission;
          this.itemPermissions.set(nextItemPermissions);
          this.itemPermissionMap.update(itemPermissionMap => {
            const nextItemPermissionMap = new Map(itemPermissionMap);
            nextItemPermissionMap.set(role, nextPermission);
            return nextItemPermissionMap;
          });
        });
      } else {
        const permission: Permission = {
          id: null,
          resourceType: this.itemType(),
          resourceId: this.item()!.id,
          roleId: role,
          permission: event,
        }
        this.permissionAPI.addPermission(permission).subscribe(data => {
          this.itemPermissions.update(itemPermissions => [...itemPermissions, data]);
          this.itemPermissionMap.update(itemPermissionMap => {
            const nextItemPermissionMap = new Map(itemPermissionMap);
            nextItemPermissionMap.set(role, data);
            return nextItemPermissionMap;
          });
          this.updatePermissionRoleIds();
        });
      }
    } else {
      if (permissionIndex < 0) {
        return;
      }

      this.permissionAPI.removePermission(itemPermissions[permissionIndex].id!).subscribe(() => {
        this.itemPermissions.update(itemPermissions => itemPermissions.filter((_, index) => index !== permissionIndex));
        this.itemPermissionMap.update(itemPermissionMap => {
          const nextItemPermissionMap = new Map(itemPermissionMap);
          nextItemPermissionMap.delete(role);
          return nextItemPermissionMap;
        });
        this.updatePermissionRoleIds();
      });
    }
  }

  preparePermission(event: string | null) {
    if (event && event.length > 0) {
      this.permissionFormGroup.patchValue({
        permission: event,
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
        roleId: this.permissionFormGroup.controls.roleid.value,
        permission: this.permissionFormGroup.controls.permission.value,
      }
      this.permissionAPI.addPermission(permission).subscribe(data => {
        const roleId = this.permissionFormGroup.controls.roleid.value;
        this.itemPermissions.update(itemPermissions => [...itemPermissions, data]);
        this.itemPermissionMap.update(itemPermissionMap => {
          const nextItemPermissionMap = new Map(itemPermissionMap);
          nextItemPermissionMap.set(roleId, data);
          return nextItemPermissionMap;
        });
        this.updatePermissionRoleIds();
      });
    }
  }

  hasProperty(name: string) {
    return this.item() && Object.prototype.hasOwnProperty.call(this.item(), name);
  }

  getProperty(name: string) {
    return Object.getOwnPropertyDescriptor(this.item(), name)?.value;
  }

  private updatePermissionRoleIds() {
    this.itemPermissionRoleIds.set(this.sortRoleIds([
      ...this.itemPermissionMap().keys(),
      ...this.inheritedPermissionMap().keys(),
    ]));
  }

  private sortRoleIds(roleIds: number[]): number[] {
    return Array.from(new Set(roleIds)).sort((a, b) => {
      if (a < b) {
        return -1;
      } else if (a > b) {
        return 1;
      }
      return 0;
    });
  }

}
