import { Component, input, OnInit, inject } from '@angular/core';

import { AntiFraud, AntiFraudPeriod, AntiFraudRuleAPI } from '../../../core';
@Component({
  selector: 'carambola-anti-fraud',
  imports: [],
  templateUrl: './anti-fraud.component.html',
  styleUrls: ['./anti-fraud.component.scss'],
})
export class AntiFraudComponent implements OnInit {
  private antiFraudRuleAPI = inject(AntiFraudRuleAPI);

  AntiFraudPeriod = AntiFraudPeriod;

  antiFraud = input.required<AntiFraud>();
  antiFraudDescription = '';

  ngOnInit() {
    this.antiFraudRuleAPI.getAntiFraudRule(this.antiFraud().rule).subscribe(antiFraudRule => {
      this.antiFraudDescription = antiFraudRule.detail;
      switch (this.antiFraud().period) {
        case AntiFraudPeriod.AF_PERIOD_SECOND:
          this.antiFraudDescription = this.antiFraudDescription.replace('#PERIOD#', '每秒');
          break;
        case AntiFraudPeriod.AF_PERIOD_MINUTE:
          this.antiFraudDescription = this.antiFraudDescription.replace('#PERIOD#', '每分钟');
          break;
        case AntiFraudPeriod.AF_PERIOD_HOUR:
          this.antiFraudDescription = this.antiFraudDescription.replace('#PERIOD#', '每小时');
          break;
        case AntiFraudPeriod.AF_PERIOD_DAY:
          this.antiFraudDescription = this.antiFraudDescription.replace('#PERIOD#', '每天');
          break;
      }
      this.antiFraudDescription = this.antiFraudDescription.replace('#LIMITATION#', String(this.antiFraud().limitation));
    });
  }

}
