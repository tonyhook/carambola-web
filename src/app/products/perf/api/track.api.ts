import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { PerfQuery, Track } from '..';

@Injectable({
  providedIn: 'root',
})
export class TrackAPI {
  private http = inject(HttpClient);

  getTrackList(query?: PerfQuery<Track>): Observable<Track[]> {
    let params = new HttpParams();
    if (query) {
      params = params.append('query', JSON.stringify(query));
    }

    return this.http.get<Track[]>(environment.apipath + '/api/managed/perf/track', { params: params, withCredentials: true });
  }

  getTrack(id: number): Observable<Track> {
    return this.http.get<Track>(environment.apipath + '/api/managed/perf/track/' + id, { withCredentials: true });
  }

  addTrack(newTrack: Track): Observable<Track> {
    return this.http.post<Track>(environment.apipath + '/api/managed/perf/track', newTrack, { withCredentials: true });
  }

  updateTrack(id: number, newTrack: Track): Observable<unknown> {
    return this.http.put(environment.apipath + '/api/managed/perf/track/' + id, newTrack, { withCredentials: true });
  }

  removeTrack(id: number): Observable<unknown> {
    return this.http.delete(environment.apipath + '/api/managed/perf/track/' + id, { withCredentials: true });
  }

}
