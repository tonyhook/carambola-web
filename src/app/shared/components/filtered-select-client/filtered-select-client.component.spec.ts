import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgControl } from '@angular/forms';

import { FilteredSelectClientComponent } from './filtered-select-client.component';

describe('FilteredSelectClientComponent', () => {
  let component: FilteredSelectClientComponent;
  let fixture: ComponentFixture<FilteredSelectClientComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ FilteredSelectClientComponent ],
      providers: [ NgControl ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(FilteredSelectClientComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
