import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
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
        provideHttpClientTesting(),
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
