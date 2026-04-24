import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { TenantManagerComponent } from './tenant.component';

describe('TenantManagerComponent', () => {
  let component: TenantManagerComponent;
  let fixture: ComponentFixture<TenantManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ TenantManagerComponent ],
      providers: [ provideHttpClientTesting() ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(TenantManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
