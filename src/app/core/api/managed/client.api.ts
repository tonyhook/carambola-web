import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { Client, Query } from '../..';

@Injectable({
  providedIn: 'root',
})
export class ClientAPI {
  private http = inject(HttpClient);

  getClientList(query?: Query<Client>): Observable<Client[]> {
    let params = new HttpParams();
    if (query) {
      params = params.append('query', JSON.stringify(query));
    }

    return this.http.get<Client[]>(environment.apipath + '/api/managed/client', { params: params, withCredentials: true });
  }

  getClient(id: number): Observable<Client> {
    return this.http.get<Client>(environment.apipath + '/api/managed/client/' + id, { withCredentials: true });
  }

  addClient(newClient: Client): Observable<Client> {
    return this.http.post<Client>(environment.apipath + '/api/managed/client', newClient, { withCredentials: true });
  }

  updateClient(id: number, newClient: Client): Observable<unknown> {
    return this.http.put(environment.apipath + '/api/managed/client/' + id, newClient, { withCredentials: true });
  }

  removeClient(id: number): Observable<unknown> {
    return this.http.delete(environment.apipath + '/api/managed/client/' + id, { withCredentials: true });
  }

}
