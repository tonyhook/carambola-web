import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { Log, Page, PageRequest, Query } from '../..';

@Injectable({
  providedIn: 'root',
})
export class LogAPI {

  constructor(
    private http: HttpClient
  ) { }

  download(query: Query<Log> | null, clear: boolean): Observable<Blob> {
    let params = new HttpParams();

    if (query) {
      params = params
        .set('clear', clear)
        .set('start', new Date(query.start!).toISOString())
        .set('end', new Date(query.end!).toISOString());
    }

    return this.http.get(environment.apipath + '/api/managed/log/download', { params: params, responseType: 'blob', withCredentials: true });
  }

  getLogList(request: PageRequest<Log>, query: Query<Log>): Observable<Page<Log>> {
    let params = new HttpParams()
      .set('page', request.page.toString())
      .set('size', request.size.toString());
    if (request.sort) {
      params = params
        .set('sort', request.sort.property)
        .set('order', request.sort.order);
    }

    if (query.start && query.end) {
      params = params
        .set('start', new Date(query.start).toISOString())
        .set('end', new Date(query.end).toISOString());
    }

    return this.http.get<Page<Log>>(environment.apipath + '/api/managed/log', { params: params, withCredentials: true });
  }

  getLog(id: number): Observable<Log> {
    return this.http.get<Log>(environment.apipath + '/api/managed/log/' + id, { withCredentials: true });
  }

  addLog(newLog: Log): Observable<Log> {
    return this.http.post<Log>(environment.apipath + '/api/managed/log', newLog, { withCredentials: true });
  }

  updateLog(id: number, newLog: Log): Observable<unknown> {
    return this.http.put(environment.apipath + '/api/managed/log/' + id, newLog, { withCredentials: true });
  }

  removeLog(id: number): Observable<unknown> {
    return this.http.delete(environment.apipath + '/api/managed/log/' + id, { withCredentials: true });
  }

}
