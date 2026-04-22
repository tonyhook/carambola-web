import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { Permission } from '../..';

@Injectable({
  providedIn: 'root',
})
export class PermissionAPI {
  private http = inject(HttpClient);

  getResourceTypeList(): Observable<string[]> {
    return this.http.get<string[]>(environment.apipath + '/api/managed/permission/resourceType', { withCredentials: true });
  }

  getItemPermissionList(resourceType: string, resourceId: number): Observable<Permission[]> {
    return this.http.get<Permission[]>(environment.apipath + '/api/managed/permission/resourceType/' + resourceType + '/resourceId/' + resourceId, { withCredentials: true });
  }

  getInheritedPermissionList(resourceType: string, resourceId: number): Observable<Permission[]> {
    return this.http.get<Permission[]>(environment.apipath + '/api/managed/permission/resourceType/' + resourceType + '/resourceId/' + resourceId + '/inherited', { withCredentials: true });
  }

  getFullPermissionList(resourceType: string, resourceId: number): Observable<Permission[]> {
    return this.http.get<Permission[]>(environment.apipath + '/api/managed/permission/resourceType/' + resourceType + '/resourceId/' + resourceId + '/full', { withCredentials: true });
  }

  getClassPermissionList(resourceType: string): Observable<Permission[]> {
    return this.http.get<Permission[]>(environment.apipath + '/api/managed/permission/resourceType/' + resourceType, { withCredentials: true });
  }

  getPermission(id: number): Observable<Permission> {
    return this.http.get<Permission>(environment.apipath + '/api/managed/permission/' + id, { withCredentials: true });
  }

  addPermission(newPermission: Permission): Observable<Permission> {
    return this.http.post<Permission>(environment.apipath + '/api/managed/permission', newPermission, { withCredentials: true });
  }

  updatePermission(id: number, newPermission: Permission): Observable<unknown> {
    return this.http.put(environment.apipath + '/api/managed/permission/' + id, newPermission, { withCredentials: true });
  }

  removePermission(id: number): Observable<unknown> {
    return this.http.delete(environment.apipath + '/api/managed/permission/' + id, { withCredentials: true });
  }

}
