import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ClientPort, Query } from '../..';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ClientPortAPI {
  private http = inject(HttpClient);

  getClientPortList(query?: Query<ClientPort>): Observable<ClientPort[]> {
    let params = new HttpParams();
    if (query) {
      params = params.append('query', JSON.stringify(query));
    }

    return this.http.get<ClientPort[]>(environment.apipath + '/api/managed/clientport', { params: params, withCredentials: true });
  }

  getClientPort(id: number): Observable<ClientPort> {
    return this.http.get<ClientPort>(environment.apipath + '/api/managed/clientport/' + id, { withCredentials: true });
  }

  addClientPort(newClientPort: ClientPort): Observable<ClientPort> {
    return this.http.post<ClientPort>(environment.apipath + '/api/managed/clientport', newClientPort, { withCredentials: true });
  }

  updateClientPort(id: number, newClientPort: ClientPort): Observable<unknown> {
    return this.http.put(environment.apipath + '/api/managed/clientport/' + id, newClientPort, { withCredentials: true });
  }

  removeClientPort(id: number): Observable<unknown> {
    return this.http.delete(environment.apipath + '/api/managed/clientport/' + id, { withCredentials: true });
  }

  getClientPortTrackerList(id: number): Observable<string[]> {
    return this.http.get<string[]>(environment.apipath + '/api/managed/clientport/' + id + '/tracker', { withCredentials: true });
  }

}
