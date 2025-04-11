import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { AuthorityFormComponent } from './authority-form.component';

describe('AuthorityFormComponent', () => {
  let component: AuthorityFormComponent;
  let fixture: ComponentFixture<AuthorityFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ AuthorityFormComponent ],
      providers: [ provideHttpClient() ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(AuthorityFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
