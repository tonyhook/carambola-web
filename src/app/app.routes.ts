import { Routes } from '@angular/router';

import { AuthGuard } from './services';

import { AdminComponent } from './components/layout/admin/admin.component';
import { HomeComponent } from './components/layout/home/home.component';
import { LoginComponent } from './components/layout/login/login.component';
import { LogoutComponent } from './components/layout/logout/logout.component';
import { MainComponent } from './components/layout/main/main.component';
import { PendingComponent } from './components/layout/pending/pending.component';

export const routes: Routes = [
  {
    path: 'admin',
    component: AdminComponent,
    children: [
      {
        path: '',
        component: MainComponent,
        canActivate: [ AuthGuard ],
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
