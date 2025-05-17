import { Routes } from '@angular/router';

import { AuthGuard } from './services';

import { AdminComponent } from './components/layout/admin/admin.component';
import { HomeComponent } from './components/layout/home/home.component';
import { LoginComponent } from './components/layout/login/login.component';
import { LogoutComponent } from './components/layout/logout/logout.component';
import { MainComponent } from './components/layout/main/main.component';
import { PendingComponent } from './components/layout/pending/pending.component';

import { MeComponent } from './components/layout/me/me.component';
import { MenuManagerComponent } from './components/management/backend/menu/menu.component';
import { AuthorityManagerComponent } from './components/management/security/authority/authority.component';
import { RoleManagerComponent } from './components/management/security/role/role.component';
import { UserManagerComponent } from './components/management/security/user/user.component';
import { LogManagerComponent } from './components/management/audit/log/log.component';

export const routes: Routes = [
  {
    path: 'admin',
    component: AdminComponent,
    children: [
      {
        path: '',
        component: MainComponent,
        canActivate: [ AuthGuard ],
        children: [
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
        ],
      },
      {
        path: 'pending',
        component: PendingComponent,
      },
      {
        path: 'login',
        component: LoginComponent,
      },
      {
        path: 'logout',
        component: LogoutComponent,
      },
      {
        path: '**',
        redirectTo: '',
      },
    ],
  },
  {
    path: '',
    component: HomeComponent,
    children: [
      {
        path: '**',
        redirectTo: '',
      },
    ],
  },
];
