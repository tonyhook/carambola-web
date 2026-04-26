import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Site } from '../..';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class OpenApplicationAPI {
  private http = inject(HttpClient);

  getSite(): Observable<Site> {
    return this.http.get<Site>(environment.apipath + '/api/open/application/site', { withCredentials: true });
  }

}
