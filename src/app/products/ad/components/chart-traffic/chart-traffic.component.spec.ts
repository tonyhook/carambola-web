import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts/core';

import { ChartTrafficComponent } from './chart-traffic.component';

describe('ChartTrafficComponent', () => {
  let component: ChartTrafficComponent;
  let fixture: ComponentFixture<ChartTrafficComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ ChartTrafficComponent ],
      providers: [
        provideHttpClient(),
        provideEchartsCore({ echarts }),
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChartTrafficComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
