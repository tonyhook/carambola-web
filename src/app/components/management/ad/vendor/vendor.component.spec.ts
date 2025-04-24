import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { routes } from '../../../../app.routes';
import { VendorManagerComponent } from './vendor.component';

describe('VendorManagerComponent', () => {
  let component: VendorManagerComponent;
  let fixture: ComponentFixture<VendorManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ VendorManagerComponent ],
      providers: [
        provideHttpClient(),
        provideRouter(routes),
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(VendorManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
