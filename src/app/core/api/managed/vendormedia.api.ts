import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { Query, VendorMedia } from '../..';

@Injectable({
  providedIn: 'root',
})
export class VendorMediaAPI {

  constructor(
    private http: HttpClient
  ) { }

  getVendorMediaList(query?: Query<VendorMedia>): Observable<VendorMedia[]> {
    let params = new HttpParams();
    if (query) {
      params = params.append('query', JSON.stringify(query));
    }

    return this.http.get<VendorMedia[]>(environment.apipath + '/api/managed/vendormedia', { params: params, withCredentials: true });
  }

  getVendorMedia(id: number): Observable<VendorMedia> {
    return this.http.get<VendorMedia>(environment.apipath + '/api/managed/vendormedia/' + id, { withCredentials: true });
  }

  addVendorMedia(newVendorMedia: VendorMedia): Observable<VendorMedia> {
    return this.http.post<VendorMedia>(environment.apipath + '/api/managed/vendormedia', newVendorMedia, { withCredentials: true });
  }

  updateVendorMedia(id: number, newVendorMedia: VendorMedia): Observable<unknown> {
    return this.http.put(environment.apipath + '/api/managed/vendormedia/' + id, newVendorMedia, { withCredentials: true });
  }

  removeVendorMedia(id: number): Observable<unknown> {
    return this.http.delete(environment.apipath + '/api/managed/vendormedia/' + id, { withCredentials: true });
  }

}
