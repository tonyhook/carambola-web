import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgControl } from '@angular/forms';

import { FilteredSelectVendorPortComponent } from './filtered-select-vendorport.component';

describe('FilteredSelectVendorPortComponent', () => {
  let component: FilteredSelectVendorPortComponent;
  let fixture: ComponentFixture<FilteredSelectVendorPortComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ FilteredSelectVendorPortComponent ],
      providers: [ NgControl ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(FilteredSelectVendorPortComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
