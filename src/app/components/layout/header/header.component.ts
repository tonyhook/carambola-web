import { NgComponentOutlet } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Title } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';

import { OpenApplicationAPI } from '../../../core';
import { AuthService, DrawerService } from '../../../services';
import { HEADER_EXTENSIONS } from './header-extension';

@Component({
  selector: 'carambola-admin-header',
  imports: [
    NgComponentOutlet,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatToolbarModule,
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent implements OnInit {
  authService = inject(AuthService);
  drawerService = inject(DrawerService);
  headerExtensions = inject(HEADER_EXTENSIONS);
  private title = inject(Title);
  private applicationAPI = inject(OpenApplicationAPI);

  name = signal('');

  ngOnInit() {
    this.applicationAPI.getSite().subscribe((site) => {
      this.name.set(site.name);
      this.title.setTitle(site.name);
    });
  }

}
