import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Query, Role } from '../..';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class RoleAPI {
  private http = inject(HttpClient);

  getRoleList(query?: Query<Role>): Observable<Role[]> {
    let params = new HttpParams();
    if (query) {
      params = params.append('query', JSON.stringify(query));
    }

    return this.http.get<Role[]>(environment.apipath + '/api/managed/role', { params: params, withCredentials: true });
  }

  getRole(id: number): Observable<Role> {
    return this.http.get<Role>(environment.apipath + '/api/managed/role/' + id, { withCredentials: true });
  }

  addRole(newRole: Role): Observable<Role> {
    return this.http.post<Role>(environment.apipath + '/api/managed/role', newRole, { withCredentials: true });
  }

  updateRole(id: number, newRole: Role): Observable<unknown> {
    return this.http.put(environment.apipath + '/api/managed/role/' + id, newRole, { withCredentials: true });
  }

  removeRole(id: number): Observable<unknown> {
    return this.http.delete(environment.apipath + '/api/managed/role/' + id, { withCredentials: true });
  }

}
