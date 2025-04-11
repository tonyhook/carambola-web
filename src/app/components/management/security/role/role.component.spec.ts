import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { RoleManagerComponent } from './role.component';

describe('RoleManagerComponent', () => {
  let component: RoleManagerComponent;
  let fixture: ComponentFixture<RoleManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ RoleManagerComponent ],
      providers: [ provideHttpClient() ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(RoleManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
