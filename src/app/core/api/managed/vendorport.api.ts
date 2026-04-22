import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { Query, VendorPort } from '../..';

@Injectable({
  providedIn: 'root',
})
export class VendorPortAPI {
  private http = inject(HttpClient);

  getVendorPortList(query?: Query<VendorPort>): Observable<VendorPort[]> {
    let params = new HttpParams();
    if (query) {
      params = params.append('query', JSON.stringify(query));
    }

    return this.http.get<VendorPort[]>(environment.apipath + '/api/managed/vendorport', { params: params, withCredentials: true });
  }

  getVendorPort(id: number): Observable<VendorPort> {
    return this.http.get<VendorPort>(environment.apipath + '/api/managed/vendorport/' + id, { withCredentials: true });
  }

  addVendorPort(newVendorPort: VendorPort): Observable<VendorPort> {
    return this.http.post<VendorPort>(environment.apipath + '/api/managed/vendorport', newVendorPort, { withCredentials: true });
  }

  updateVendorPort(id: number, newVendorPort: VendorPort): Observable<unknown> {
    return this.http.put(environment.apipath + '/api/managed/vendorport/' + id, newVendorPort, { withCredentials: true });
  }

  removeVendorPort(id: number): Observable<unknown> {
    return this.http.delete(environment.apipath + '/api/managed/vendorport/' + id, { withCredentials: true });
  }

}
