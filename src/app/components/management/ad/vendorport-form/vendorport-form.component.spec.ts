import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { VendorPortFormComponent } from './vendorport-form.component';

describe('VendorPortFormComponent', () => {
  let component: VendorPortFormComponent;
  let fixture: ComponentFixture<VendorPortFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ VendorPortFormComponent ],
      providers: [ provideHttpClient() ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(VendorPortFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
