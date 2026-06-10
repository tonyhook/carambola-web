import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
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
        provideHttpClient(),
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
