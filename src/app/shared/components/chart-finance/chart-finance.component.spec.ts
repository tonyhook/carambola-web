import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts/core';

import { ChartFinanceComponent } from './chart-finance.component';

describe('ChartFinanceComponent', () => {
  let component: ChartFinanceComponent;
  let fixture: ComponentFixture<ChartFinanceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ ChartFinanceComponent ],
      providers: [
        provideHttpClient(),
        provideEchartsCore({ echarts }),
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChartFinanceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
