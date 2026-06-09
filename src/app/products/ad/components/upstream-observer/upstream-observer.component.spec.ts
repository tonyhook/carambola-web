import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { provideCarambolaDateAdapter } from '../../../../shared';
import { routes } from '../../../../app.routes';
import { UpstreamObserverComponent } from './upstream-observer.component';

describe('UpstreamObserverComponent', () => {
  let component: UpstreamObserverComponent;
  let fixture: ComponentFixture<UpstreamObserverComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ UpstreamObserverComponent ],
      providers: [
        provideHttpClientTesting(),
        provideRouter(routes),
        provideCarambolaDateAdapter(),
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(UpstreamObserverComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
