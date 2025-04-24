import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { Query, Tenant, TenantDefault } from '../..';

@Injectable({
  providedIn: 'root',
})
export class TenantAPI {

  constructor(
    private http: HttpClient
  ) { }

  getCurrentTenant(): Observable<TenantDefault> {
    return this.http.get<TenantDefault>(environment.apipath + '/api/managed/tenant/current', { withCredentials: true });
  }

  switchCurrentTenant(tenant: Tenant): Observable<unknown> {
    return this.http.post(environment.apipath + '/api/managed/tenant/current', tenant, { withCredentials: true });
  }

  getTenantList(query?: Query<Tenant>): Observable<Tenant[]> {
    let params = new HttpParams();
    if (query) {
      params = params.append('query', JSON.stringify(query));
    }

    return this.http.get<Tenant[]>(environment.apipath + '/api/managed/tenant', { params: params, withCredentials: true });
  }

  getTenant(id: number): Observable<Tenant> {
    return this.http.get<Tenant>(environment.apipath + '/api/managed/tenant/' + id, { withCredentials: true });
  }

  addTenant(newTenant: Tenant): Observable<Tenant> {
    return this.http.post<Tenant>(environment.apipath + '/api/managed/tenant', newTenant, { withCredentials: true });
  }

  updateTenant(id: number, newTenant: Tenant): Observable<unknown> {
    return this.http.put(environment.apipath + '/api/managed/tenant/' + id, newTenant, { withCredentials: true });
  }

  removeTenant(id: number): Observable<unknown> {
    return this.http.delete(environment.apipath + '/api/managed/tenant/' + id, { withCredentials: true });
  }

}
