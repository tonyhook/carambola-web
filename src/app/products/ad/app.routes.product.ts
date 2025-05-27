import { Routes } from '@angular/router';

import { TenantManagerComponent } from '@app/products/ad/components/tenant/tenant.component';
import { ClientManagerComponent } from '@app/products/ad/components/client/client.component';
import { ClientMediaManagerComponent } from '@app/products/ad/components/clientmedia/clientmedia.component';
import { ClientPortManagerComponent } from '@app/products/ad/components/clientport/clientport.component';
import { VendorManagerComponent } from '@app/products/ad/components/vendor/vendor.component';
import { VendorMediaManagerComponent } from '@app/products/ad/components/vendormedia/vendormedia.component';
import { VendorPortManagerComponent } from '@app/products/ad/components/vendorport/vendorport.component';
import { PerformanceComponent } from '@app/products/ad/components/performance/performance.component';
import { BillComponent } from '@app/products/ad/components/bill/bill.component';
import { SignComponent } from '@app/products/ad/components/sign/sign.component';
import { SummaryComponent } from '@app/products/ad/components/summary/summary.component';
import { UpstreamObserverComponent } from '@app/products/ad/components/upstream-observer/upstream-observer.component';
import { DownstreamManagerComponent } from '@app/products/ad/components/downstream-manager/downstream-manager.component';
import { EncryptComponent } from '@app/products/ad/components/encrypt/encrypt.component';

export const adManagementRoutes: Routes = [
  {
    path: 'ad/tenant',
    component: TenantManagerComponent,
  },
  {
    path: 'ad/client',
    component: ClientManagerComponent,
  },
  {
    path: 'ad/clientmedia',
    component: ClientMediaManagerComponent,
  },
  {
    path: 'ad/clientport',
    component: ClientPortManagerComponent,
  },
  {
    path: 'ad/vendor',
    component: VendorManagerComponent,
  },
  {
    path: 'ad/vendormedia',
    component: VendorMediaManagerComponent,
  },
  {
    path: 'ad/vendorport',
    component: VendorPortManagerComponent,
  },
  {
    path: 'ad/performance',
    component: PerformanceComponent,
  },
  {
    path: 'ad/bill',
    component: BillComponent,
  },
  {
    path: 'ad/sign',
    component: SignComponent,
  },
  {
    path: 'ad/summary',
    component: SummaryComponent,
  },
  {
    path: 'ad/observer',
    component: UpstreamObserverComponent,
  },
  {
    path: 'ad/manager',
    component: DownstreamManagerComponent,
  },
  {
    path: 'ad/encrypt',
    component: EncryptComponent,
  },
];

export const productManagementRoutes: Routes = [
  ...adManagementRoutes,
];
