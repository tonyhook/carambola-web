import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdEntityComponent } from './ad-entity.component';

describe('AdEntityComponent', () => {
  let component: AdEntityComponent;
  let fixture: ComponentFixture<AdEntityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ AdEntityComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdEntityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
