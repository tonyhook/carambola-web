import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { Server } from '../..';

@Injectable({
  providedIn: 'root',
})
export class ServerAPI {
  private http = inject(HttpClient);

  getServerStatus(): Observable<Record<number, number>> {
    return this.http.get<Record<number, number>>(environment.apipath + '/api/managed/server/status', { withCredentials: true });
  }

  getServerList(): Observable<Server[]> {
    return this.http.get<Server[]>(environment.apipath + '/api/managed/server', { withCredentials: true });
  }

  getServer(id: number): Observable<Server> {
    return this.http.get<Server>(environment.apipath + '/api/managed/server/' + id, { withCredentials: true });
  }

  addServer(newServer: Server): Observable<Server> {
    return this.http.post<Server>(environment.apipath + '/api/managed/server', newServer, { withCredentials: true });
  }

  updateServer(id: number, newServer: Server): Observable<unknown> {
    return this.http.put(environment.apipath + '/api/managed/server/' + id, newServer, { withCredentials: true });
  }

  removeServer(id: number): Observable<unknown> {
    return this.http.delete(environment.apipath + '/api/managed/server/' + id, { withCredentials: true });
  }

  service(id: number, service: string, action: string): Observable<unknown> {
    return this.http.get(environment.apipath + '/api/managed/server/' + id + '/' + service + '/' + action, { withCredentials: true });
  }

}
