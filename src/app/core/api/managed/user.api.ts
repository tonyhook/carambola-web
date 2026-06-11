import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { Query, User } from '../..';

@Injectable({
  providedIn: 'root',
})
export class UserAPI {
  private http = inject(HttpClient);

  getUserList(query?: Query<User>): Observable<User[]> {
    let params = new HttpParams();
    if (query) {
      params = params.append('query', JSON.stringify(query));
    }

    return this.http.get<User[]>(environment.apipath + '/api/managed/user', { params: params, withCredentials: true });
  }

  getUser(id: number): Observable<User> {
    return this.http.get<User>(environment.apipath + '/api/managed/user/' + id, { withCredentials: true });
  }

  addUser(newUser: User): Observable<User> {
    return this.http.post<User>(environment.apipath + '/api/managed/user', newUser, { withCredentials: true });
  }

  updateUser(id: number, newUser: User): Observable<unknown> {
    return this.http.put(environment.apipath + '/api/managed/user/' + id, newUser, { withCredentials: true });
  }

  removeUser(id: number): Observable<unknown> {
    return this.http.delete(environment.apipath + '/api/managed/user/' + id, { withCredentials: true });
  }

  updatePassword(password: string): Observable<unknown> {
    return this.http.put(environment.apipath + '/api/managed/user', password, { withCredentials: true });
  }

}
