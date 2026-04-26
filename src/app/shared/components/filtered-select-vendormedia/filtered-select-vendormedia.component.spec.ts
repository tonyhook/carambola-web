import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgControl } from '@angular/forms';

import { FilteredSelectVendorMediaComponent } from './filtered-select-vendormedia.component';

describe('FilteredSelectVendorMediaComponent', () => {
  let component: FilteredSelectVendorMediaComponent;
  let fixture: ComponentFixture<FilteredSelectVendorMediaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ FilteredSelectVendorMediaComponent ],
      providers: [ NgControl ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(FilteredSelectVendorMediaComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
