import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FilteredSelectComponent } from './filtered-select.component';

describe('FilteredSelectComponent', () => {
  let component: FilteredSelectComponent;
  let fixture: ComponentFixture<FilteredSelectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ FilteredSelectComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FilteredSelectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
