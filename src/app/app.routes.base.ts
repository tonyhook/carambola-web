import { Routes } from '@angular/router';

import { MeComponent } from './components/layout/me/me.component';
import { MenuManagerComponent } from './components/management/backend/menu/menu.component';
import { AuthorityManagerComponent } from './components/management/security/authority/authority.component';
import { RoleManagerComponent } from './components/management/security/role/role.component';
import { UserManagerComponent } from './components/management/security/user/user.component';
import { LogManagerComponent } from './components/management/audit/log/log.component';

export const baseManagementRoutes: Routes = [
  {
    path: 'me',
    component: MeComponent,
  },
  {
    path: 'backend/menu',
    component: MenuManagerComponent,
  },
  {
    path: 'backend/menu/:id',
    component: MenuManagerComponent,
  },
  {
    path: 'security/authority',
    component: AuthorityManagerComponent,
  },
  {
    path: 'security/role',
    component: RoleManagerComponent,
  },
  {
    path: 'security/user',
    component: UserManagerComponent,
  },
  {
    path: 'audit/log',
    component: LogManagerComponent,
  },
];
