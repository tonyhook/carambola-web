import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { ServerFormComponent } from './server-form.component';

describe('ServerFormComponent', () => {
  let component: ServerFormComponent;
  let fixture: ComponentFixture<ServerFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ ServerFormComponent ],
      providers: [ provideHttpClientTesting() ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ServerFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
