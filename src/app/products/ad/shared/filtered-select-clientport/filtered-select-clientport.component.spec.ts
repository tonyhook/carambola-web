import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgControl } from '@angular/forms';

import { FilteredSelectClientPortComponent } from './filtered-select-clientport.component';

describe('FilteredSelectClientPortComponent', () => {
  let component: FilteredSelectClientPortComponent;
  let fixture: ComponentFixture<FilteredSelectClientPortComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ FilteredSelectClientPortComponent ],
      providers: [ NgControl ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(FilteredSelectClientPortComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
