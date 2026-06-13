import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { PerfEventOptions } from '..';

@Injectable({
  providedIn: 'root',
})
export class EventCatalogAPI {
  private http = inject(HttpClient);

  getMediaEvents(): Observable<PerfEventOptions> {
    return this.http.get<PerfEventOptions>(environment.apipath + '/api/managed/perf/event-catalog/media-events', { withCredentials: true });
  }

}
