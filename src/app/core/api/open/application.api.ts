import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { Site } from '../..';

@Injectable({
  providedIn: 'root',
})
export class OpenApplicationAPI {
  private http = inject(HttpClient);

  getSite(): Observable<Site> {
    return this.http.get<Site>(environment.apipath + '/api/open/application/site', { withCredentials: true });
  }

}
