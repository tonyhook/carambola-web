import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { routes } from '../../../../app.routes';
import { MenuManagerComponent } from './menu.component';

describe('MenuManagerComponent', () => {
  let component: MenuManagerComponent;
  let fixture: ComponentFixture<MenuManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ MenuManagerComponent ],
      providers: [
        provideHttpClientTesting(),
        provideRouter(routes),
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(MenuManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
