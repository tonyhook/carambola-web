import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreeViewComponent } from './treeview.component';

describe('TreeViewComponent', () => {
  let component: TreeViewComponent;
  let fixture: ComponentFixture<TreeViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ TreeViewComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TreeViewComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
