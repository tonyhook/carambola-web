import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { PerformancePlaceholder, Query, TrafficControl } from '../..';

@Injectable({
  providedIn: 'root',
})
export class TrafficControlAPI {
  private http = inject(HttpClient);

  getTrafficControlList(query: Query<PerformancePlaceholder>): Observable<TrafficControl[]> {
    let params = new HttpParams();
    params = params.append('query', JSON.stringify(query));

    return this.http.get<TrafficControl[]>(environment.apipath + '/api/managed/trafficcontrol', { params: params, withCredentials: true });
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
