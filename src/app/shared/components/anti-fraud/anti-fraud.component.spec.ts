import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { AntiFraudPeriod } from '../../../core';
import { AntiFraudComponent } from './anti-fraud.component';

describe('AntiFraudComponent', () => {
  let component: AntiFraudComponent;
  let fixture: ComponentFixture<AntiFraudComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ AntiFraudComponent ],
      providers: [ provideHttpClient() ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(AntiFraudComponent);
    fixture.componentRef.setInput('antiFraud', {
      id: null,
      clientPort: -1,
      vendorPort: -1,
      bundle: '',
      rule: '',
      period: AntiFraudPeriod.AF_PERIOD_SECOND,
      limitation: 0,
    });
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
