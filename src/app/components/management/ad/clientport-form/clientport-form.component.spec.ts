import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { ClientPortFormComponent } from './clientport-form.component';

describe('ClientPortFormComponent', () => {
  let component: ClientPortFormComponent;
  let fixture: ComponentFixture<ClientPortFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ ClientPortFormComponent ],
      providers: [ provideHttpClient() ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClientPortFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
