import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { PerfQuery } from '..';
import { Media } from '..';

@Injectable({
  providedIn: 'root',
})
export class MediaAPI {
  private http = inject(HttpClient);

  getMediaList(query?: PerfQuery<Media>): Observable<Media[]> {
    let params = new HttpParams();
    if (query) {
      params = params.append('query', JSON.stringify(query));
    }

    return this.http.get<Media[]>(environment.apipath + '/api/managed/perf/media', { params: params, withCredentials: true });
  }

  getMedia(id: number): Observable<Media> {
    return this.http.get<Media>(environment.apipath + '/api/managed/perf/media/' + id, { withCredentials: true });
  }

  getMediaEventUrl(id: number, mediaCode: string, mediaEvent: string): Observable<string> {
    const params = new HttpParams()
      .append('mediaCode', mediaCode)
      .append('mediaEvent', mediaEvent);

    return this.http.get(environment.apipath + '/api/managed/perf/media/' + id + '/event-url', { params: params, responseType: 'text', withCredentials: true });
  }

  addMedia(newMedia: Media): Observable<Media> {
    return this.http.post<Media>(environment.apipath + '/api/managed/perf/media', newMedia, { withCredentials: true });
  }

  updateMedia(id: number, newMedia: Media): Observable<unknown> {
    return this.http.put(environment.apipath + '/api/managed/perf/media/' + id, newMedia, { withCredentials: true });
  }

  removeMedia(id: number): Observable<unknown> {
    return this.http.delete(environment.apipath + '/api/managed/perf/media/' + id, { withCredentials: true });
  }

}
