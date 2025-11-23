import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts/core';

import { ChartPostlinkComponent } from './chart-postlink.component';

describe('ChartPostlinkComponent', () => {
  let component: ChartPostlinkComponent;
  let fixture: ComponentFixture<ChartPostlinkComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ ChartPostlinkComponent ],
      providers: [
        provideHttpClient(),
        provideEchartsCore({ echarts }),
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChartPostlinkComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
