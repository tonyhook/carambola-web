import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { AuthorityManagerComponent } from './authority.component';

describe('AuthorityManagerComponent', () => {
  let component: AuthorityManagerComponent;
  let fixture: ComponentFixture<AuthorityManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ AuthorityManagerComponent ],
      providers: [ provideHttpClientTesting() ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(AuthorityManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
