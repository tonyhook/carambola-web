import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { ClientMediaFormComponent } from './clientmedia-form.component';

describe('ClientMediaFormComponent', () => {
  let component: ClientMediaFormComponent;
  let fixture: ComponentFixture<ClientMediaFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ ClientMediaFormComponent ],
      providers: [ provideHttpClient() ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClientMediaFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
