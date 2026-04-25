import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MatPaginatorIntl } from '@angular/material/paginator';

import { routes } from './app.routes';
import { productProviders } from './app.providers.product';
import { provideCarambolaDateAdapter } from './shared';
import { CarambolaMatPaginatorIntl, HttpErrorInterceptor } from './shared';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(
      withInterceptorsFromDi(),
    ),
    provideAnimationsAsync(),
    provideCarambolaDateAdapter(),
    ...productProviders,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: HttpErrorInterceptor,
      multi: true
    },
    {
      provide: MatPaginatorIntl,
      useClass: CarambolaMatPaginatorIntl,
    },
  ]
};
