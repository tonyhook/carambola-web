import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';

import { OpenApplicationAPI } from '../../../core';

@Component({
  selector: 'carambola-admin-footer',
  imports: [
    MatButtonModule,
    MatToolbarModule,
  ],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss'
})
export class FooterComponent implements OnInit {
  private applicationAPI = inject(OpenApplicationAPI);

  company = signal('');
  registration = signal<string | null>(null);

  ngOnInit() {
    this.applicationAPI.getSite().subscribe((site) => {
      this.company.set(site.company);
      this.registration.set(site.registration);
    });
  }

}
