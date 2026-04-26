import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Title } from '@angular/platform-browser';
import { Router, RouterModule } from '@angular/router';

import { OpenApplicationAPI } from '../../../core';
import { AuthService, DrawerService } from '../../../services';

@Component({
  selector: 'carambola-admin-header',
  imports: [
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
  private title = inject(Title);
  public authService = inject(AuthService);
  public drawerService = inject(DrawerService);
  private applicationAPI = inject(OpenApplicationAPI);

  name = signal('');

  ngOnInit() {
    this.applicationAPI.getSite().subscribe((site) => {
      this.name.set(site.name);
      this.title.setTitle(site.name);
    });
  }

}
