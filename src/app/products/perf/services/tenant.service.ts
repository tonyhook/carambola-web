import { effect, inject, Injectable, signal, WritableSignal } from '@angular/core';
import { forkJoin } from 'rxjs';

import { AuthService } from '../../../services';
import {
  ROLE_CLIENT_MANAGER,
  ROLE_CLIENT_PROJECT_MANAGER,
  ROLE_TENANT_MANAGER,
  Tenant,
  TenantAPI,
} from '..';

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
  isClient: WritableSignal<boolean> = signal(false);
  isClientSub: WritableSignal<boolean> = signal(false);

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

          this.isManager.set(this.hasAuthority('PERF_MANAGEMENT'));
          this.isClient.set(this.hasAuthority('PERF_CLIENT'));
          this.isClientSub.set(this.hasAuthority('PERF_CLIENT_SUB'));
          this.isTenantManager.set(tenantDefault.tenant.user.filter(user => user.username === credential.username).filter(user => user.role === ROLE_TENANT_MANAGER).length > 0);
        });
      }
    });
  }

  switchTenant(tenant: Tenant) {
    this.tenantAPI.switchCurrentTenant(tenant).subscribe(() => {
      this.tenant.set(tenant);
    });
  }

  isClientManager(client: number | null | undefined): boolean {
    const credential = this.authService.credential();
    const tenant = this.tenant();
    if (!credential || !tenant || client === null || client === undefined) {
      return false;
    }

    return tenant.user.filter(user => user.username === credential.username && user.role === ROLE_CLIENT_MANAGER && user.resource === client).length > 0;
  }

  isClientProjectManager(clientProject: number | null | undefined): boolean {
    const credential = this.authService.credential();
    const tenant = this.tenant();
    if (!credential || !tenant || clientProject === null || clientProject === undefined) {
      return false;
    }

    return tenant.user.filter(user => user.username === credential.username && user.role === ROLE_CLIENT_PROJECT_MANAGER && user.resource === clientProject).length > 0;
  }

  private hasAuthority(authority: string): boolean {
    const credential = this.authService.credential();
    if (!credential) {
      return false;
    }

    return credential.authorities.map(a => a.authority).filter(a => a === authority).length > 0;
  }

}
