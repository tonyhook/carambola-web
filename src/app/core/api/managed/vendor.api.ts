import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Query, Vendor } from '../..';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class VendorAPI {
  private http = inject(HttpClient);

  getVendorList(query?: Query<Vendor>): Observable<Vendor[]> {
    let params = new HttpParams();
    if (query) {
      params = params.append('query', JSON.stringify(query));
    }

    return this.http.get<Vendor[]>(environment.apipath + '/api/managed/vendor', { params: params, withCredentials: true });
  }

  getVendor(id: number): Observable<Vendor> {
    return this.http.get<Vendor>(environment.apipath + '/api/managed/vendor/' + id, { withCredentials: true });
  }

  addVendor(newVendor: Vendor): Observable<Vendor> {
    return this.http.post<Vendor>(environment.apipath + '/api/managed/vendor', newVendor, { withCredentials: true });
  }

  updateVendor(id: number, newVendor: Vendor): Observable<unknown> {
    return this.http.put(environment.apipath + '/api/managed/vendor/' + id, newVendor, { withCredentials: true });
  }

  removeVendor(id: number): Observable<unknown> {
    return this.http.delete(environment.apipath + '/api/managed/vendor/' + id, { withCredentials: true });
  }

}
