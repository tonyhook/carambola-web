import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { PerfQuery } from '..';
import { ClientProject } from '..';

@Injectable({
  providedIn: 'root',
})
export class ClientProjectAPI {
  private http = inject(HttpClient);

  getClientProjectList(query?: PerfQuery<ClientProject>): Observable<ClientProject[]> {
    let params = new HttpParams();
    if (query) {
      params = params.append('query', JSON.stringify(query));
    }

    return this.http.get<ClientProject[]>(environment.apipath + '/api/managed/perf/client-project', { params: params, withCredentials: true });
  }

  getClientProject(id: number): Observable<ClientProject> {
    return this.http.get<ClientProject>(environment.apipath + '/api/managed/perf/client-project/' + id, { withCredentials: true });
  }

  addClientProject(newClientProject: ClientProject): Observable<ClientProject> {
    return this.http.post<ClientProject>(environment.apipath + '/api/managed/perf/client-project', newClientProject, { withCredentials: true });
  }

  updateClientProject(id: number, newClientProject: ClientProject): Observable<unknown> {
    return this.http.put(environment.apipath + '/api/managed/perf/client-project/' + id, newClientProject, { withCredentials: true });
  }

  removeClientProject(id: number): Observable<unknown> {
    return this.http.delete(environment.apipath + '/api/managed/perf/client-project/' + id, { withCredentials: true });
  }

}
