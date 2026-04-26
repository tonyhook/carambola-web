import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { PerformancePartner, PerformancePlaceholder, Query } from '../..';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class PerformanceAPI {
  private http = inject(HttpClient);

  getPerformanceClientList(interval: string, expand: boolean, start: string, end: string, query?: Query<PerformancePlaceholder>): Observable<PerformancePartner[]> {
    let params = new HttpParams()
      .set('interval', interval)
      .set('expand', expand)
      .set('start', start)
      .set('end', end);
    if (query) {
      params = params.append('query', JSON.stringify(query));
    }

    return this.http.get<PerformancePartner[]>(environment.apipath + '/api/managed/performance/client', { params: params, withCredentials: true });
  }

  getPerformanceVendorList(interval: string, expand: boolean, start: string, end: string, query?: Query<PerformancePlaceholder>): Observable<PerformancePartner[]> {
    let params = new HttpParams()
      .set('interval', interval)
      .set('expand', expand)
      .set('start', start)
      .set('end', end);
    if (query) {
      params = params.append('query', JSON.stringify(query));
    }

    return this.http.get<PerformancePartner[]>(environment.apipath + '/api/managed/performance/vendor', { params: params, withCredentials: true });
  }

  getPerformanceClientBundleList(interval: string, expand: boolean, start: string, end: string, query?: Query<PerformancePlaceholder>): Observable<PerformancePartner[]> {
    let params = new HttpParams()
      .set('interval', interval)
      .set('expand', expand)
      .set('start', start)
      .set('end', end);
    if (query) {
      params = params.append('query', JSON.stringify(query));
    }

    return this.http.get<PerformancePartner[]>(environment.apipath + '/api/managed/performance/client/bundle', { params: params, withCredentials: true });
  }

  getPerformanceVendorBundleList(interval: string, expand: boolean, start: string, end: string, query?: Query<PerformancePlaceholder>): Observable<PerformancePartner[]> {
    let params = new HttpParams()
      .set('interval', interval)
      .set('expand', expand)
      .set('start', start)
      .set('end', end);
    if (query) {
      params = params.append('query', JSON.stringify(query));
    }

    return this.http.get<PerformancePartner[]>(environment.apipath + '/api/managed/performance/vendor/bundle', { params: params, withCredentials: true });
  }

  downloadPerformanceClientList(interval: string, start: string, end: string, query?: Query<PerformancePlaceholder>): Observable<Blob> {
    let params = new HttpParams()
      .set('interval', interval)
      .set('start', start)
      .set('end', end);
    if (query) {
      params = params.append('query', JSON.stringify(query));
    }

    return this.http.get(environment.apipath + '/api/managed/performance/client/download', { params: params, responseType: 'blob', withCredentials: true });
  }

  downloadPerformanceVendorList(interval: string, start: string, end: string, query?: Query<PerformancePlaceholder>): Observable<Blob> {
    let params = new HttpParams()
      .set('interval', interval)
      .set('start', start)
      .set('end', end);
    if (query) {
      params = params.append('query', JSON.stringify(query));
    }

    return this.http.get(environment.apipath + '/api/managed/performance/vendor/download', { params: params, responseType: 'blob', withCredentials: true });
  }

  downloadPerformanceClientBundleList(interval: string, start: string, end: string, query?: Query<PerformancePlaceholder>): Observable<Blob> {
    let params = new HttpParams()
      .set('interval', interval)
      .set('start', start)
      .set('end', end);
    if (query) {
      params = params.append('query', JSON.stringify(query));
    }

    return this.http.get(environment.apipath + '/api/managed/performance/client/bundle/download', { params: params, responseType: 'blob', withCredentials: true });
  }

  downloadPerformanceVendorBundleList(interval: string, start: string, end: string, query?: Query<PerformancePlaceholder>): Observable<Blob> {
    let params = new HttpParams()
      .set('interval', interval)
      .set('start', start)
      .set('end', end);
    if (query) {
      params = params.append('query', JSON.stringify(query));
    }

    return this.http.get(environment.apipath + '/api/managed/performance/vendor/bundle/download', { params: params, responseType: 'blob', withCredentials: true });
  }

}
