import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { ServerManagerComponent } from './server.component';

describe('ServerManagerComponent', () => {
  let component: ServerManagerComponent;
  let fixture: ComponentFixture<ServerManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ ServerManagerComponent ],
      providers: [ provideHttpClient() ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ServerManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
