import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { routes } from '../../../../app.routes';
import { ClientMediaManagerComponent } from './clientmedia.component';

describe('ClientMediaManagerComponent', () => {
  let component: ClientMediaManagerComponent;
  let fixture: ComponentFixture<ClientMediaManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ ClientMediaManagerComponent ],
      providers: [
        provideHttpClientTesting(),
        provideRouter(routes),
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClientMediaManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
