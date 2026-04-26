import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { PerformancePlaceholder, Query, TrafficControl } from '../..';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class TrafficControlAPI {
  private http = inject(HttpClient);

  getTrafficControlListByQuery(query: Query<PerformancePlaceholder>): Observable<TrafficControl[]> {
    let params = new HttpParams();
    params = params.append('query', JSON.stringify(query));

    return this.http.get<TrafficControl[]>(environment.apipath + '/api/managed/trafficcontrol/query', { params: params, withCredentials: true });
  }

  getTrafficControlListByPort(clientPortId: number, vendorPortId: number): Observable<TrafficControl[]> {
    const params = new HttpParams()
      .set('clientPortId', clientPortId)
      .set('vendorPortId', vendorPortId);

    return this.http.get<TrafficControl[]>(environment.apipath + '/api/managed/trafficcontrol/port', { params: params, withCredentials: true });
  }

  addTrafficControl(newTrafficControl: TrafficControl): Observable<TrafficControl> {
    return this.http.post<TrafficControl>(environment.apipath + '/api/managed/trafficcontrol', newTrafficControl, { withCredentials: true });
  }

  updateTrafficControl(id: number,newTrafficControl: TrafficControl): Observable<unknown> {
    return this.http.put(environment.apipath + '/api/managed/trafficcontrol/' + id, newTrafficControl, { withCredentials: true });
  }

  removeTrafficControl(id: number): Observable<unknown> {
    return this.http.delete(environment.apipath + '/api/managed/trafficcontrol/' + id, { withCredentials: true });
  }

}
