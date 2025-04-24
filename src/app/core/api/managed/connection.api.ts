import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { Page, PageRequest, Connection } from '../..';

@Injectable({
  providedIn: 'root',
})
export class ConnectionAPI {

  constructor(
    private http: HttpClient
  ) { }

  getConnectionList(request: PageRequest<Connection>): Observable<Page<Connection>> {
    let params = new HttpParams()
      .set('page', request.page.toString())
      .set('size', request.size.toString());
    if (request.sort) {
      params = params
        .set('sort', request.sort.property)
        .set('order', request.sort.order);
    }

    return this.http.get<Page<Connection>>(environment.apipath + '/api/managed/connection', { params: params, withCredentials: true });
  }

  getConnection(id: number): Observable<Connection> {
    return this.http.get<Connection>(environment.apipath + '/api/managed/connection/' + id, { withCredentials: true });
  }

  addConnection(newConnection: Connection): Observable<Connection> {
    return this.http.post<Connection>(environment.apipath + '/api/managed/connection', newConnection, { withCredentials: true });
  }

  updateConnection(id: number, newConnection: Connection): Observable<unknown> {
    return this.http.put(environment.apipath + '/api/managed/connection/' + id, newConnection, { withCredentials: true });
  }

  removeConnection(id: number): Observable<unknown> {
    return this.http.delete(environment.apipath + '/api/managed/connection/' + id, { withCredentials: true });
  }

}
