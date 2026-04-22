import { effect, Injectable, signal, WritableSignal, inject } from '@angular/core';
import { forkJoin } from 'rxjs';

import { PartnerType, ROLE_TENANT_DOWNSTREAM_MANAGER_DIRECT, ROLE_TENANT_DOWNSTREAM_MANAGER_PROGRAMMATIC, ROLE_TENANT_MANAGER, ROLE_TENANT_OBSERVER, ROLE_TENANT_OPERATOR, Tenant, TenantAPI, Vendor } from '../../core';
import { AuthService } from '..';

@Injectable({
  providedIn: 'root',
})
export class TenantService {
  private authService = inject(AuthService);
  private tenantAPI = inject(TenantAPI);

  tenant: WritableSignal<Tenant | null> = signal(null);
  tenants: WritableSignal<Tenant[]> = signal([]);
  isManager: WritableSignal<boolean> = signal(false);
  isTenantManager: WritableSignal<boolean> = signal(false);
  isTenantOperator: WritableSignal<boolean> = signal(false);
  isTenantObserver: WritableSignal<boolean> = signal(false);

  constructor() {
    effect(() => {
      const credential = this.authService.credential();
      if (credential) {
        forkJoin([
          this.tenantAPI.getCurrentTenant(),
          this.tenantAPI.getTenantList(),
        ]).subscribe(([tenantDefault, tenantList]) => {
          this.tenant.set(tenantDefault.tenant);
          this.tenants.set(tenantList);

          this.isManager.set(credential.authorities.map(a => a.authority).filter(a => a === 'AD_MANAGEMENT').length > 0);
          this.isTenantManager.set(tenantDefault.tenant.user.filter(user => user.username === this.authService.credential()!.username).filter(user => user.role === ROLE_TENANT_MANAGER).length > 0);
          this.isTenantOperator.set(tenantDefault.tenant.user.filter(user => user.username === this.authService.credential()!.username).filter(user => user.role === ROLE_TENANT_OPERATOR).length > 0);
          this.isTenantObserver.set(tenantDefault.tenant.user.filter(user => user.username === this.authService.credential()!.username).filter(user => user.role === ROLE_TENANT_OBSERVER).length > 0);
        });
      }
    });
  }

  switchTenant(tenant: Tenant) {
    this.tenantAPI.switchCurrentTenant(tenant).subscribe(() => {
      this.tenant.set(tenant);
    });
  }

  isVendorManager(vendor: Vendor): boolean {
    const tenant = this.tenant();
    if (tenant) {
      return tenant.user.filter(user => user.username === this.authService.credential()!.username).filter(user => (vendor.mode === PartnerType.PARTNER_TYPE_DIRECT && user.role === ROLE_TENANT_DOWNSTREAM_MANAGER_DIRECT || vendor.mode === PartnerType.PARTNER_TYPE_PROGRAMMATIC && user.role === ROLE_TENANT_DOWNSTREAM_MANAGER_PROGRAMMATIC) && user.resource === vendor.id).length > 0;
    } else {
      return false;
    }
  }

}
