import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Router } from '@angular/router';

import { Tenant, TenantService } from '../..';

@Component({
  selector: 'carambola-ad-tenant-menu',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
  ],
  templateUrl: './tenant-menu.component.html',
})
export class TenantMenuComponent {
  private router = inject(Router);
  tenantService = inject(TenantService);

  switchTenant(tenant: Tenant) {
    this.tenantService.switchTenant(tenant);
    this.router.navigate(['/admin']);
  }
}
