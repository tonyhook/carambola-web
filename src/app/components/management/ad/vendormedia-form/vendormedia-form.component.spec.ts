import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { VendorMediaFormComponent } from './vendormedia-form.component';

describe('VendorMediaFormComponent', () => {
  let component: VendorMediaFormComponent;
  let fixture: ComponentFixture<VendorMediaFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ VendorMediaFormComponent ],
      providers: [ provideHttpClient() ],
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
