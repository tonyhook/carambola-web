import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { routes } from '../../../../app.routes';
import { VendorMediaManagerComponent } from './vendormedia.component';

describe('VendorMediaManagerComponent', () => {
  let component: VendorMediaManagerComponent;
  let fixture: ComponentFixture<VendorMediaManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ VendorMediaManagerComponent ],
      providers: [
        provideHttpClient(),
        provideRouter(routes),
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(VendorMediaManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
