import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { UserManagerComponent } from './user.component';

describe('UserManagerComponent', () => {
  let component: UserManagerComponent;
  let fixture: ComponentFixture<UserManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ UserManagerComponent ],
      providers: [ provideHttpClient() ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
