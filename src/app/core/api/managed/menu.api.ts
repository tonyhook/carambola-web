import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { Menu } from '../..';

@Injectable({
  providedIn: 'root',
})
export class MenuAPI {

  constructor(
    private http: HttpClient
  ) { }

  getMenuList(): Observable<Menu[]> {
    return this.http.get<Menu[]>(environment.apipath + '/api/managed/menu', { withCredentials: true });
  }

  getMenu(id: number): Observable<Menu> {
    return this.http.get<Menu>(environment.apipath + '/api/managed/menu/' + id, { withCredentials: true });
  }

  addMenu(newMenu: Menu): Observable<Menu> {
    return this.http.post<Menu>(environment.apipath + '/api/managed/menu', newMenu, { withCredentials: true });
  }

  updateMenu(id: number, newMenu: Menu): Observable<unknown> {
    return this.http.put(environment.apipath + '/api/managed/menu/' + id, newMenu, { withCredentials: true });
  }

  removeMenu(id: number): Observable<unknown> {
    return this.http.delete(environment.apipath + '/api/managed/menu/' + id, { withCredentials: true });
  }

}
