import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { LineChart, PieChart } from 'echarts/charts';
import { DatasetComponent, GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer, SVGRenderer } from 'echarts/renderers';
import { provideEchartsCore } from 'ngx-echarts';

import { CarambolaMatPaginatorIntl, httpErrorInterceptor } from './shared';
import { provideCarambolaDateAdapter } from './shared';
import { routes } from './app.routes';

echarts.use([LineChart, PieChart, GridComponent, TooltipComponent, LegendComponent, DatasetComponent, CanvasRenderer, SVGRenderer]);

export const CARAMBOLA_FORMATS = {
  parse: {
    dateInput: 'YYYY-MM-DD',
    timeInput: 'HH:mm',
  },
  display: {
    dateInput: 'YYYY-MM-DD',
    monthYearLabel: 'YYYY-MM',
    dateA11yLabel: 'YYYY-MM-DD',
    monthYearA11yLabel: 'YYYY-MM',
    timeInput: 'HH:mm',
    timeOptionLabel: 'HH:mm',
  },
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([httpErrorInterceptor]),
    ),
    provideAnimationsAsync(),
    provideCarambolaDateAdapter(),
    provideEchartsCore(
      { echarts }
    ),
    {
      provide: MatPaginatorIntl,
      useClass: CarambolaMatPaginatorIntl,
    },
  ]
};
