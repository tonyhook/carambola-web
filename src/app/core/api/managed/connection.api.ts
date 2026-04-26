import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Connection, Page, PageRequest, PerformancePlaceholder, Query } from '../..';
import { environment } from '../../../../environments/environment';

export type TimedPairedClientPortMap = Record<number, Record<number, number[]>>;
export type TimedPairedVendorPortMap = Record<number, Record<number, number[]>>;

@Injectable({
  providedIn: 'root',
})
export class ConnectionAPI {
  private http = inject(HttpClient);

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

  getPairedClientPortMap(start: string, end: string, query?: Query<PerformancePlaceholder>): Observable<TimedPairedClientPortMap> {
    let params = new HttpParams()
      .set('start', start)
      .set('end', end);
    if (query) {
      params = params.append('query', JSON.stringify(query));
    }

    return this.http.get<TimedPairedClientPortMap>(environment.apipath + '/api/managed/connection/paired/client', { params: params, withCredentials: true });
  }

  getPairedVendorPortMap(start: string, end: string, query?: Query<PerformancePlaceholder>): Observable<TimedPairedVendorPortMap> {
    let params = new HttpParams()
      .set('start', start)
      .set('end', end);
    if (query) {
      params = params.append('query', JSON.stringify(query));
    }

    return this.http.get<TimedPairedVendorPortMap>(environment.apipath + '/api/managed/connection/paired/vendor', { params: params, withCredentials: true });
  }

}
