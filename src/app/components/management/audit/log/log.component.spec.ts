import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { provideCarambolaDateAdapter } from '../../../../shared';
import { LogManagerComponent } from './log.component';

describe('LogManagerComponent', () => {
  let component: LogManagerComponent;
  let fixture: ComponentFixture<LogManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ LogManagerComponent ],
      providers: [
        provideHttpClientTesting(),
        provideCarambolaDateAdapter(),
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(LogManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
