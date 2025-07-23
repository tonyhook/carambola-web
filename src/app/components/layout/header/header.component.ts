import { Component, OnInit, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';

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

  name = '';

  ngOnInit() {
    this.applicationAPI.getSite().subscribe((site) => {
      this.name = site.name;
      this.title.setTitle(site.name);
    });
  }

}
