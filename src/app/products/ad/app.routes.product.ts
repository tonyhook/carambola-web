import { Routes } from '@angular/router';

import { TenantManagerComponent } from '@app/products/ad/components/tenant/tenant.component';
import { ClientManagerComponent } from '@app/products/ad/components/client/client.component';
import { ClientMediaManagerComponent } from '@app/products/ad/components/clientmedia/clientmedia.component';
import { ClientPortManagerComponent } from '@app/products/ad/components/clientport/clientport.component';
import { VendorManagerComponent } from '@app/products/ad/components/vendor/vendor.component';
import { VendorMediaManagerComponent } from '@app/products/ad/components/vendormedia/vendormedia.component';
import { VendorPortManagerComponent } from '@app/products/ad/components/vendorport/vendorport.component';

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
];

export const productManagementRoutes: Routes = [
  ...adManagementRoutes,
];
