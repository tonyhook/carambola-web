import { Pipe, PipeTransform } from '@angular/core';

import { switchMap } from 'rxjs/operators';
import { of } from 'rxjs';

import { RoleAPI } from '../../core';

@Pipe({
  name: 'getRoleName',
})
export class GetRoleNamePipe implements PipeTransform {

  constructor(
    private roleAPI: RoleAPI,
  ) { }

  transform(roleId: number) {
    return this.roleAPI.getRole(roleId).pipe(
        switchMap(data => of(data.name)),
    );
  }

}
