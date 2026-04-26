import { Component, input } from '@angular/core';

import { TrafficControl, TrafficControlIndicator, TrafficControlPeriod } from '../../../core';

@Component({
  selector: 'carambola-traffic-control',
  imports: [],
  templateUrl: './traffic-control.component.html',
  styleUrls: ['./traffic-control.component.scss'],
})
export class TrafficControlComponent {
  TrafficControlIndicator = TrafficControlIndicator;
  TrafficControlPeriod = TrafficControlPeriod;

  trafficControl = input.required<TrafficControl>();

}
