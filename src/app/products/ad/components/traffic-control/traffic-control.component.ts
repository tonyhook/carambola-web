import { Component, Input } from '@angular/core';

import { TrafficControl, TrafficControlIndicator, TrafficControlPeriod } from '../..';

@Component({
  selector: 'carambola-traffic-control',
  imports: [],
  templateUrl: './traffic-control.component.html',
  styleUrls: ['./traffic-control.component.scss'],
})
export class TrafficControlComponent {
  TrafficControlIndicator = TrafficControlIndicator;
  TrafficControlPeriod = TrafficControlPeriod;

  @Input() trafficControl!: TrafficControl;

}
