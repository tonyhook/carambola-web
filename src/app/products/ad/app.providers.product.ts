import { Provider } from '@angular/core';

import { HEADER_EXTENSIONS } from '@app/components/layout/header/header-extension';
import { DocumentLinkMenuComponent } from '@app/products/ad/shared/document-link/document-link-menu.component';
import { DocumentLinkToolbarComponent } from '@app/products/ad/shared/document-link/document-link-toolbar.component';
import { EncryptLinkMenuComponent } from '@app/products/ad/shared/encrypt-link/encrypt-link-menu.component';
import { EncryptLinkToolbarComponent } from '@app/products/ad/shared/encrypt-link/encrypt-link-toolbar.component';
import { TenantMenuComponent } from '@app/products/ad/shared/tenant-switcher/tenant-menu.component';
import { TenantToolbarComponent } from '@app/products/ad/shared/tenant-switcher/tenant-toolbar.component';

export const productProviders: Provider[] = [
  {
    provide: HEADER_EXTENSIONS,
    useValue: {
      toolbarComponent: DocumentLinkToolbarComponent,
      menuComponent: DocumentLinkMenuComponent,
    },
    multi: true,
  },
  {
    provide: HEADER_EXTENSIONS,
    useValue: {
      toolbarComponent: EncryptLinkToolbarComponent,
      menuComponent: EncryptLinkMenuComponent,
    },
    multi: true,
  },
  {
    provide: HEADER_EXTENSIONS,
    useValue: {
      toolbarComponent: TenantToolbarComponent,
      menuComponent: TenantMenuComponent,
    },
    multi: true,
  },
];
