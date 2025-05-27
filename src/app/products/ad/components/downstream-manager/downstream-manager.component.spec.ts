import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { provideCarambolaDateAdapter } from '../../../../shared';
import { routes } from '../../../../app.routes';
import { DownstreamManagerComponent } from './downstream-manager.component';

describe('DownstreamManagerComponent', () => {
  let component: DownstreamManagerComponent;
  let fixture: ComponentFixture<DownstreamManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ DownstreamManagerComponent ],
      providers: [
        provideHttpClient(),
        provideRouter(routes),
        provideCarambolaDateAdapter(),
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(DownstreamManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
