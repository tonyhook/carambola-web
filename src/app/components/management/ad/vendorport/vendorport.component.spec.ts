import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { routes } from '../../../../app.routes';
import { VendorPortManagerComponent } from './vendorport.component';

describe('VendorPortManagerComponent', () => {
  let component: VendorPortManagerComponent;
  let fixture: ComponentFixture<VendorPortManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ VendorPortManagerComponent ],
      providers: [
        provideHttpClient(),
        provideRouter(routes),
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(VendorPortManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
