import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { Authority, Query } from '../..';

@Injectable({
  providedIn: 'root',
})
export class AuthorityAPI {

  constructor(
    private http: HttpClient
  ) { }

  getAuthorityList(query?: Query<Authority>): Observable<Authority[]> {
    let params = new HttpParams();
    if (query) {
      params = params.append('query', JSON.stringify(query));
    }

    return this.http.get<Authority[]>(environment.apipath + '/api/managed/authority', { params: params, withCredentials: true });
  }

  getAuthority(id: number): Observable<Authority> {
    return this.http.get<Authority>(environment.apipath + '/api/managed/authority/' + id, { withCredentials: true });
  }

  addAuthority(newAuthority: Authority): Observable<Authority> {
    return this.http.post<Authority>(environment.apipath + '/api/managed/authority', newAuthority, { withCredentials: true });
  }

  updateAuthority(id: number, newAuthority: Authority): Observable<unknown> {
    return this.http.put(environment.apipath + '/api/managed/authority/' + id, newAuthority, { withCredentials: true });
  }

  removeAuthority(id: number): Observable<unknown> {
    return this.http.delete(environment.apipath + '/api/managed/authority/' + id, { withCredentials: true });
  }

}
