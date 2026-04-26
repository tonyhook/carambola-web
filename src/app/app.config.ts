import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';

import { CarambolaMatPaginatorIntl, httpErrorInterceptor } from './shared';
import { provideCarambolaDateAdapter } from './shared';
import { routes } from './app.routes';
import { productProviders } from './app.providers.product';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([httpErrorInterceptor]),
    ),
    provideAnimationsAsync(),
    provideCarambolaDateAdapter(),
    ...productProviders,
    {
      provide: MatPaginatorIntl,
      useClass: CarambolaMatPaginatorIntl,
    },
  ]
};
