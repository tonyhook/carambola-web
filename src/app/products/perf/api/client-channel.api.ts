import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { PerfQuery } from '..';
import { ClientChannel, ClientChannelRoute, ClientChannelRouteView } from '..';

@Injectable({
  providedIn: 'root',
})
export class ClientChannelAPI {
  private http = inject(HttpClient);

  getClientChannelList(query?: PerfQuery<ClientChannel>): Observable<ClientChannel[]> {
    let params = new HttpParams();
    if (query) {
      params = params.append('query', JSON.stringify(query));
    }

    return this.http.get<ClientChannel[]>(environment.apipath + '/api/managed/perf/client-channel', { params: params, withCredentials: true });
  }

  getClientChannel(id: number): Observable<ClientChannel> {
    return this.http.get<ClientChannel>(environment.apipath + '/api/managed/perf/client-channel/' + id, { withCredentials: true });
  }

  addClientChannel(newClientChannel: ClientChannel): Observable<ClientChannel> {
    return this.http.post<ClientChannel>(environment.apipath + '/api/managed/perf/client-channel', newClientChannel, { withCredentials: true });
  }

  updateClientChannel(id: number, newClientChannel: ClientChannel): Observable<unknown> {
    return this.http.put(environment.apipath + '/api/managed/perf/client-channel/' + id, newClientChannel, { withCredentials: true });
  }

  removeClientChannel(id: number): Observable<unknown> {
    return this.http.delete(environment.apipath + '/api/managed/perf/client-channel/' + id, { withCredentials: true });
  }

  getRoutes(clientChannelId: number): Observable<ClientChannelRoute[]> {
    return this.http.get<ClientChannelRoute[]>(
      environment.apipath + '/api/managed/perf/client-channel/' + clientChannelId + '/route',
      { withCredentials: true },
    );
  }

  getAllRoutes(): Observable<ClientChannelRouteView[]> {
    return this.http.get<ClientChannelRouteView[]>(
      environment.apipath + '/api/managed/perf/client-channel-route',
      { withCredentials: true },
    );
  }

  addRoute(clientChannelId: number, route: ClientChannelRoute): Observable<ClientChannelRoute> {
    return this.http.post<ClientChannelRoute>(
      environment.apipath + '/api/managed/perf/client-channel/' + clientChannelId + '/route',
      route,
      { withCredentials: true },
    );
  }

  updateRoute(clientChannelId: number, routeId: number, route: ClientChannelRoute): Observable<unknown> {
    return this.http.put(
      environment.apipath + '/api/managed/perf/client-channel/' + clientChannelId + '/route/' + routeId,
      route,
      { withCredentials: true },
    );
  }

  removeRoute(clientChannelId: number, routeId: number): Observable<unknown> {
    return this.http.delete(
      environment.apipath + '/api/managed/perf/client-channel/' + clientChannelId + '/route/' + routeId,
      { withCredentials: true },
    );
  }

}
