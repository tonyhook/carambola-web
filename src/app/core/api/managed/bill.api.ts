import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { Bill, Medium, PerformancePlaceholder, Query, Sign, Upload } from '../..';

@Injectable({
  providedIn: 'root',
})
export class BillAPI {

  constructor(
    private http: HttpClient
  ) { }

  getBillList(interval: string, start: string, end: string, query?: Query<PerformancePlaceholder>): Observable<Bill[]> {
    let params = new HttpParams()
      .set('interval', interval)
      .set('start', start)
      .set('end', end);
    if (query) {
      params = params.append('query', JSON.stringify(query));
    }

    return this.http.get<Bill[]>(environment.apipath + '/api/managed/bill', { params: params, withCredentials: true });
  }

  addBillList(bills: Bill[]): Observable<Bill[]> {
    return this.http.post<Bill[]>(environment.apipath + '/api/managed/bill', bills, { withCredentials: true });
  }

  removeBillList(bills: Bill[]): Observable<Bill[]> {
    return this.http.post<Bill[]>(environment.apipath + '/api/managed/bill/remove', bills, { withCredentials: true });
  }

  uploadBill(file: File): Observable<Upload> {
    const tzo = new Date().getTimezoneOffset();
    const dif = tzo < 0 ? 'GMT+' : 'GMT-';
    const pad = function(num: number) {
      return (num < 10 ? '0' : '') + num;
    }

    const url = environment.apipath + '/api/managed/bill/upload';
    const params = new HttpParams()
      .set('timezone', dif + pad(Math.floor(Math.abs(tzo) / 60)) + ':' + pad(Math.abs(tzo) % 60));
    const formData = new FormData();
    formData.append('upload', file);
    return this.http.post<Upload>(url, formData, { params: params, withCredentials: true });
  }

  downloadBill(interval: string, aggregateUpstream: string, start: string, end: string, query?: Query<PerformancePlaceholder>): Observable<Blob> {
    let params = new HttpParams()
      .set('interval', interval)
      .set('aggregateUpstream', aggregateUpstream)
      .set('start', start)
      .set('end', end);
    if (query) {
      params = params.append('query', JSON.stringify(query));
    }

    return this.http.get(environment.apipath + '/api/managed/bill/download', { params: params, responseType: 'blob', withCredentials: true });
  }

  getMediumListClient(interval: string, start: string, end: string, query?: Query<PerformancePlaceholder>): Observable<Medium[]> {
    let params = new HttpParams()
      .set('interval', interval)
      .set('start', start)
      .set('end', end);
    if (query) {
      params = params.append('query', JSON.stringify(query));
    }

    return this.http.get<Medium[]>(environment.apipath + '/api/managed/medium/client', { params: params, withCredentials: true });
  }

  getMediumListVendor(interval: string, start: string, end: string, query?: Query<PerformancePlaceholder>): Observable<Medium[]> {
    let params = new HttpParams()
      .set('interval', interval)
      .set('start', start)
      .set('end', end);
    if (query) {
      params = params.append('query', JSON.stringify(query));
    }

    return this.http.get<Medium[]>(environment.apipath + '/api/managed/medium/vendor', { params: params, withCredentials: true });
  }

  getSignList(interval: string, start: string, end: string, query?: Query<PerformancePlaceholder>): Observable<Sign[]> {
    let params = new HttpParams()
      .set('interval', interval)
      .set('start', start)
      .set('end', end);
    if (query) {
      params = params.append('query', JSON.stringify(query));
    }

    return this.http.get<Sign[]>(environment.apipath + '/api/managed/sign', { params: params, withCredentials: true });
  }

  addSignList(signs: Sign[]): Observable<Sign[]> {
    return this.http.post<Sign[]>(environment.apipath + '/api/managed/sign', signs, { withCredentials: true });
  }

  removeSignList(signs: Sign[]): Observable<Sign[]> {
    return this.http.post<Sign[]>(environment.apipath + '/api/managed/sign/remove', signs, { withCredentials: true });
  }

  signSignList(signs: Sign[]): Observable<Sign[]> {
    return this.http.post<Sign[]>(environment.apipath + '/api/managed/sign/sign', signs, { withCredentials: true });
  }

  revokeSignList(signs: Sign[]): Observable<Sign[]> {
    return this.http.post<Sign[]>(environment.apipath + '/api/managed/sign/revoke', signs, { withCredentials: true });
  }

  uploadSign(file: File): Observable<Upload> {
    const tzo = new Date().getTimezoneOffset();
    const dif = tzo < 0 ? 'GMT+' : 'GMT-';
    const pad = function(num: number) {
      return (num < 10 ? '0' : '') + num;
    }

    const url = environment.apipath + '/api/managed/sign/upload';
    const params = new HttpParams()
      .set('timezone', dif + pad(Math.floor(Math.abs(tzo) / 60)) + ':' + pad(Math.abs(tzo) % 60));
    const formData = new FormData();
    formData.append('upload', file);
    return this.http.post<Upload>(url, formData, { params: params, withCredentials: true });
  }

  downloadSign(interval: string, aggregateDownstream: string, start: string, end: string, query?: Query<PerformancePlaceholder>): Observable<Blob> {
    let params = new HttpParams()
      .set('interval', interval)
      .set('aggregateDownstream', aggregateDownstream)
      .set('start', start)
      .set('end', end);
    if (query) {
      params = params.append('query', JSON.stringify(query));
    }

    return this.http.get(environment.apipath + '/api/managed/sign/download', { params: params, responseType: 'blob', withCredentials: true });
  }

  downloadSummary(interval: string, aggregateUpstream: string, aggregateDownstream: string, start: string, end: string, queryUpstream?: Query<PerformancePlaceholder>, queryDownstream?: Query<PerformancePlaceholder>): Observable<Blob> {
    let params = new HttpParams()
      .set('interval', interval)
      .set('aggregateUpstream', aggregateUpstream)
      .set('aggregateDownstream', aggregateDownstream)
      .set('start', start)
      .set('end', end);
    if (queryUpstream) {
      params = params.append('queryUpstream', JSON.stringify(queryUpstream));
    }
    if (queryDownstream) {
      params = params.append('queryDownstream', JSON.stringify(queryDownstream));
    }

    return this.http.get(environment.apipath + '/api/managed/summary/download', { params: params, responseType: 'blob', withCredentials: true });
  }

}
