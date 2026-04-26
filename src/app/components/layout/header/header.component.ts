import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Title } from '@angular/platform-browser';
import { Router, RouterModule } from '@angular/router';

import { OpenApplicationAPI, Tenant } from '../../../core';
import { AuthService, DrawerService, TenantService } from '../../../services';

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
  private router = inject(Router);
  private title = inject(Title);
  authService = inject(AuthService);
  drawerService = inject(DrawerService);
  tenantService = inject(TenantService);
  private applicationAPI = inject(OpenApplicationAPI);

  name = signal('');

  ngOnInit() {
    this.applicationAPI.getSite().subscribe((site) => {
      this.name.set(site.name);
      this.title.setTitle(site.name);
    });
  }

  switchTenant(tenant: Tenant) {
    this.tenantService.switchTenant(tenant);
    this.router.navigate(['/admin']);
  }

  downloadDocument() {
    const a = document.createElement('a');
    a.href = '/carambola.pdf';
    a.download = 'carambola.pdf';
    a.click();
  }

}
