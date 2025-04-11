import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { RoleFormComponent } from './role-form.component';

describe('RoleFormComponent', () => {
  let component: RoleFormComponent;
  let fixture: ComponentFixture<RoleFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ RoleFormComponent ],
      providers: [ provideHttpClient() ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(RoleFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
