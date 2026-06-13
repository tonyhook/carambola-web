import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { TenantAPI } from '../api';
import { TenantUser } from '../entity';

@Injectable({
  providedIn: 'root',
})
export class TenantUserService {
  private tenantAPI = inject(TenantAPI);

  syncResourceUsers(tenantId: number, role: number, resource: number, usernames: string[]): Observable<unknown> {
    const uniqueUsernames = Array.from(new Set(usernames.map(username => username.trim()).filter(username => username.length > 0)));
    const resourceUsers: TenantUser[] = uniqueUsernames.map(username => ({
      id: null,
      username,
      role,
      resource,
    }));

    if (resourceUsers.length === 0) {
      resourceUsers.push({
        id: null,
        username: '',
        role,
        resource,
      });
    }

    return this.tenantAPI.syncResourceUsers(tenantId, resourceUsers);
  }

  getResourceUsernames(tenantId: number, role: number, resource: number): Observable<string[]> {
    return this.tenantAPI.getResourceUsers(tenantId, role, resource).pipe(
      map(users => users.map(user => user.username)),
    );
  }
}
