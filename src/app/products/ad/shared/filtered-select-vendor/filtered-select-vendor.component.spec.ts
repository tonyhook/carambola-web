import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgControl } from '@angular/forms';

import { FilteredSelectVendorComponent } from './filtered-select-vendor.component';

describe('FilteredSelectVendorComponent', () => {
  let component: FilteredSelectVendorComponent;
  let fixture: ComponentFixture<FilteredSelectVendorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ FilteredSelectVendorComponent ],
      providers: [ NgControl ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(FilteredSelectVendorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
