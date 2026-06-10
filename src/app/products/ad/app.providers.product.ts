import { Provider } from '@angular/core';

import { HEADER_EXTENSIONS } from '@app/components/layout/header/header-extension';
import { TenantMenuComponent } from '@app/products/ad/shared/tenant-switcher/tenant-menu.component';
import { TenantToolbarComponent } from '@app/products/ad/shared/tenant-switcher/tenant-toolbar.component';

export const productProviders: Provider[] = [
  {
    provide: HEADER_EXTENSIONS,
    useValue: {
      toolbarComponent: TenantToolbarComponent,
      menuComponent: TenantMenuComponent,
    },
    multi: true,
  },
];
