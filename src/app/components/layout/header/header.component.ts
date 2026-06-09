import { NgComponentOutlet } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Title } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';

import { OpenApplicationAPI } from '../../../core';
import { AuthService, DrawerService } from '../../../services';
import { HEADER_EXTENSIONS, HeaderExtension } from './header-extension';

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
  name = '';

  constructor(
    public authService: AuthService,
    public drawerService: DrawerService,
    @Inject(HEADER_EXTENSIONS) public headerExtensions: HeaderExtension[],
    private title: Title,
    private applicationAPI: OpenApplicationAPI,
  ) {
  }

  ngOnInit() {
    this.applicationAPI.getSite().subscribe((site) => {
      this.name = site.name;
      this.title.setTitle(site.name);
    });
  }

}
