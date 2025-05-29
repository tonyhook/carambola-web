import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { AntiFraud } from '../..';

@Injectable({
  providedIn: 'root',
})
export class AntiFraudAPI {
  private http = inject(HttpClient);

  getAntiFraudListByPort(clientPortId: number): Observable<AntiFraud[]> {
    const params = new HttpParams()
      .set('clientPortId', clientPortId);

    return this.http.get<AntiFraud[]>(environment.apipath + '/api/managed/antifraud/port', { params: params, withCredentials: true });
  }

  addAntiFraud(newAntiFraud: AntiFraud): Observable<AntiFraud> {
    return this.http.post<AntiFraud>(environment.apipath + '/api/managed/antifraud', newAntiFraud, { withCredentials: true });
  }

  updateAntiFraud(id: number,newAntiFraud: AntiFraud): Observable<unknown> {
    return this.http.put(environment.apipath + '/api/managed/antifraud/' + id, newAntiFraud, { withCredentials: true });
  }

  removeAntiFraud(id: number): Observable<unknown> {
    return this.http.delete(environment.apipath + '/api/managed/antifraud/' + id, { withCredentials: true });
  }

}
