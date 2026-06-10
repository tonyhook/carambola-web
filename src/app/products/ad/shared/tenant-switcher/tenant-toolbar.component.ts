import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Router } from '@angular/router';

import { Tenant, TenantService } from '../..';

@Component({
  selector: 'carambola-ad-tenant-toolbar',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
  ],
  templateUrl: './tenant-toolbar.component.html',
})
export class TenantToolbarComponent {
  constructor(
    private router: Router,
    public tenantService: TenantService,
  ) {
  }

  switchTenant(tenant: Tenant) {
    this.tenantService.switchTenant(tenant);
    this.router.navigate(['/admin']);
  }
}
