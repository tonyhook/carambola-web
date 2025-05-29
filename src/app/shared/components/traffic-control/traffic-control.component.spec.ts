import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TrafficControlIndicator, TrafficControlPeriod } from '../../../core';
import { TrafficControlComponent } from './traffic-control.component';

describe('TrafficControlComponent', () => {
  let component: TrafficControlComponent;
  let fixture: ComponentFixture<TrafficControlComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ TrafficControlComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TrafficControlComponent);
    fixture.componentRef.setInput('trafficControl', {
      id: null,
      clientPort: -1,
      vendorPort: -1,
      bundle: '',
      indicator: TrafficControlIndicator.TC_INDICATOR_REQUEST,
      period: TrafficControlPeriod.TC_PERIOD_SECOND,
      limitation: 0,
    });
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
