import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { VendorMediaFormComponent } from './vendormedia-form.component';

describe('VendorMediaFormComponent', () => {
  let component: VendorMediaFormComponent;
  let fixture: ComponentFixture<VendorMediaFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ VendorMediaFormComponent ],
      providers: [ provideHttpClientTesting() ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(VendorMediaFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
