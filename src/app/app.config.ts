import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';

import { CarambolaMatPaginatorIntl, HttpErrorInterceptor } from './shared';
import { provideCarambolaDateAdapter } from './shared';
import { routes } from './app.routes';
import { productProviders } from './app.providers.product';

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
