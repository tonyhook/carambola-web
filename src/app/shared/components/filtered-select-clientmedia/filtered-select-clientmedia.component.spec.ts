import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgControl } from '@angular/forms';

import { FilteredSelectClientMediaComponent } from './filtered-select-clientmedia.component';

describe('FilteredSelectClientMediaComponent', () => {
  let component: FilteredSelectClientMediaComponent;
  let fixture: ComponentFixture<FilteredSelectClientMediaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ FilteredSelectClientMediaComponent ],
      providers: [ NgControl ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(FilteredSelectClientMediaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
