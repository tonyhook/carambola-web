import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { routes } from '../../../../app.routes';
import { ClientPortManagerComponent } from './clientport.component';

describe('ClientPortManagerComponent', () => {
  let component: ClientPortManagerComponent;
  let fixture: ComponentFixture<ClientPortManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ ClientPortManagerComponent ],
      providers: [
        provideHttpClient(),
        provideRouter(routes),
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClientPortManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
