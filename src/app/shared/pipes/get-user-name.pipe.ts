import { Pipe, PipeTransform } from '@angular/core';

import { switchMap } from 'rxjs/operators';
import { of } from 'rxjs';

import { UserAPI } from '../../core';

@Pipe({
  name: 'getUserName',
})
export class GetUserNamePipe implements PipeTransform {

  constructor(
    private userAPI: UserAPI,
  ) { }

  transform(userId: number) {
    return this.userAPI.getUser(userId).pipe(
        switchMap(data => of(data.username)),
    );
  }

}
