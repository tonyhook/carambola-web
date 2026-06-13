import { Routes } from '@angular/router';

import {
  ClientChannelManagerComponent,
  ClientManagerComponent,
  ClientProjectManagerComponent,
  CountComponent,
  MediaManagerComponent,
  TenantManagerComponent,
  TrackManagerComponent,
} from '@app/products/perf/components';

export const perfManagementRoutes: Routes = [
  {
    path: 'perf/tenant',
    component: TenantManagerComponent,
  },
  {
    path: 'perf/client',
    component: ClientManagerComponent,
  },
  {
    path: 'perf/client-project',
    component: ClientProjectManagerComponent,
  },
  {
    path: 'perf/client-channel',
    component: ClientChannelManagerComponent,
  },
  {
    path: 'perf/count',
    component: CountComponent,
  },
  {
    path: 'perf/media',
    component: MediaManagerComponent,
  },
  {
    path: 'perf/track',
    component: TrackManagerComponent,
  },
];

export const productManagementRoutes: Routes = [
  ...perfManagementRoutes,
];
