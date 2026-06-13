import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { PerfQuery } from '..';
import { Tenant, TenantDefault, TenantUser } from '..';

@Injectable({
  providedIn: 'root',
})
export class TenantAPI {
  private http = inject(HttpClient);

  getCurrentTenant(): Observable<TenantDefault> {
    return this.http.get<TenantDefault>(environment.apipath + '/api/managed/perf/tenant/current', { withCredentials: true });
  }

  switchCurrentTenant(tenant: Tenant): Observable<unknown> {
    return this.http.post(environment.apipath + '/api/managed/perf/tenant/current', tenant, { withCredentials: true });
  }

  getTenantList(query?: PerfQuery<Tenant>): Observable<Tenant[]> {
    let params = new HttpParams();
    if (query) {
      params = params.append('query', JSON.stringify(query));
    }

    return this.http.get<Tenant[]>(environment.apipath + '/api/managed/perf/tenant', { params: params, withCredentials: true });
  }

  getTenant(id: number): Observable<Tenant> {
    return this.http.get<Tenant>(environment.apipath + '/api/managed/perf/tenant/' + id, { withCredentials: true });
  }

  getResourceUsers(id: number, role: number, resource: number): Observable<TenantUser[]> {
    const params = new HttpParams()
      .append('role', role)
      .append('resource', resource);

    return this.http.get<TenantUser[]>(environment.apipath + '/api/managed/perf/tenant/' + id + '/user', { params: params, withCredentials: true });
  }

  syncResourceUsers(id: number, users: TenantUser[]): Observable<unknown> {
    return this.http.put(environment.apipath + '/api/managed/perf/tenant/' + id + '/user', users, { withCredentials: true });
  }

  addTenant(newTenant: Tenant): Observable<Tenant> {
    return this.http.post<Tenant>(environment.apipath + '/api/managed/perf/tenant', newTenant, { withCredentials: true });
  }

  updateTenant(id: number, newTenant: Tenant): Observable<unknown> {
    return this.http.put(environment.apipath + '/api/managed/perf/tenant/' + id, newTenant, { withCredentials: true });
  }

  removeTenant(id: number): Observable<unknown> {
    return this.http.delete(environment.apipath + '/api/managed/perf/tenant/' + id, { withCredentials: true });
  }

}
