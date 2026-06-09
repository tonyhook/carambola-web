import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { ClientPortFormComponent } from './clientport-form.component';

describe('ClientPortFormComponent', () => {
  let component: ClientPortFormComponent;
  let fixture: ComponentFixture<ClientPortFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ ClientPortFormComponent ],
      providers: [ provideHttpClientTesting() ],
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
