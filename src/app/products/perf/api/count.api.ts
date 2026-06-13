import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { CountView, EventView } from '..';

export interface CountQuery {
  interval: 'hour' | 'day';
  level: 'client' | 'project' | 'channel';
  timezoneOffset: number;
  start: string;
  end: string;
  clientId: number | null;
  clientProjectId: number | null;
  media: string | null;
  operator: string | null;
}

export interface CountEventQuery {
  start: string;
  end: string;
  event: string;
  clientId: number | null;
  clientProjectId: number | null;
  clientChannelId: number | null;
  media: string | null;
  operator: string | null;
  page?: number;
  size?: number;
}

export interface CountEventPage {
  content: EventView[];
  totalElements: number;
  page: number;
  size: number;
}

@Injectable({
  providedIn: 'root',
})
export class CountAPI {
  private http = inject(HttpClient);

  getCountList(query: CountQuery): Observable<CountView[]> {
    let params = new HttpParams()
      .append('interval', query.interval)
      .append('level', query.level)
      .append('timezoneOffset', query.timezoneOffset)
      .append('start', query.start)
      .append('end', query.end);

    if (query.clientId !== null) {
      params = params.append('clientId', query.clientId);
    }
    if (query.clientProjectId !== null) {
      params = params.append('clientProjectId', query.clientProjectId);
    }
    if (query.media !== null) {
      params = params.append('media', query.media);
    }
    if (query.operator !== null) {
      params = params.append('operator', query.operator);
    }
    return this.http.get<CountView[]>(environment.apipath + '/api/managed/perf/count', { params: params, withCredentials: true });
  }

  getRecentEvents(query: CountEventQuery): Observable<CountEventPage> {
    let params = new HttpParams()
      .append('start', query.start)
      .append('end', query.end)
      .append('event', query.event)
      .append('page', query.page ?? 0)
      .append('size', query.size ?? 10);

    if (query.clientId !== null) {
      params = params.append('clientId', query.clientId);
    }
    if (query.clientProjectId !== null) {
      params = params.append('clientProjectId', query.clientProjectId);
    }
    if (query.clientChannelId !== null) {
      params = params.append('clientChannelId', query.clientChannelId);
    }
    if (query.media !== null) {
      params = params.append('media', query.media);
    }
    if (query.operator !== null) {
      params = params.append('operator', query.operator);
    }
    return this.http.get<CountEventPage>(environment.apipath + '/api/managed/perf/count/events', { params: params, withCredentials: true });
  }

}
