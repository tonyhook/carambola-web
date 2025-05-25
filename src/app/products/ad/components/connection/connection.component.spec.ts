import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { ConnectionManagerComponent } from './connection.component';

describe('ConnectionManagerComponent', () => {
  let component: ConnectionManagerComponent;
  let fixture: ComponentFixture<ConnectionManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ ConnectionManagerComponent ],
      providers: [ provideHttpClient() ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConnectionManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
