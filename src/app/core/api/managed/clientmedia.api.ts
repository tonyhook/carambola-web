import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ClientMedia, Query } from '../..';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ClientMediaAPI {
  private http = inject(HttpClient);

  getClientMediaList(query?: Query<ClientMedia>): Observable<ClientMedia[]> {
    let params = new HttpParams();
    if (query) {
      params = params.append('query', JSON.stringify(query));
    }

    return this.http.get<ClientMedia[]>(environment.apipath + '/api/managed/clientmedia', { params: params, withCredentials: true });
  }

  getClientMedia(id: number): Observable<ClientMedia> {
    return this.http.get<ClientMedia>(environment.apipath + '/api/managed/clientmedia/' + id, { withCredentials: true });
  }

  addClientMedia(newClientMedia: ClientMedia): Observable<ClientMedia> {
    return this.http.post<ClientMedia>(environment.apipath + '/api/managed/clientmedia', newClientMedia, { withCredentials: true });
  }

  updateClientMedia(id: number, newClientMedia: ClientMedia): Observable<unknown> {
    return this.http.put(environment.apipath + '/api/managed/clientmedia/' + id, newClientMedia, { withCredentials: true });
  }

  removeClientMedia(id: number): Observable<unknown> {
    return this.http.delete(environment.apipath + '/api/managed/clientmedia/' + id, { withCredentials: true });
  }

}
