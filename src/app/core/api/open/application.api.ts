import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { Site } from '../..';

@Injectable({
  providedIn: 'root',
})
export class OpenApplicationAPI {

  constructor(
    private http: HttpClient
  ) { }

  getSite(): Observable<Site> {
    return this.http.get<Site>(environment.apipath + '/api/open/application/site', { withCredentials: true });
  }

}
