import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { routes } from '../../../app.routes';
import { MenuItemComponent } from './menu-item.component';

describe('MenuItemComponent', () => {
  let component: MenuItemComponent;
  let fixture: ComponentFixture<MenuItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ MenuItemComponent ],
      providers: [
        provideRouter(routes),
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(MenuItemComponent);
    fixture.componentRef.setInput('item', {
      id: 0,
      name: '',
      sequence: 0,
      icon: '',
      link: '',
      disabled: false,
      parent: null,
      children: [],
    });
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
