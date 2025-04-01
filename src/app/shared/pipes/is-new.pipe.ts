import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'isNew',
})
export class IsNewPipe implements PipeTransform {

  transform(timeStr: string | null) {
    const now = new Date();
    if (timeStr === null) {
      return '';
    } else {
      const time = new Date(timeStr);
      const diff = now.getTime() - time.getTime();
      if (diff < 1000 * 60 * 60 * 24) {
        return 'new';
      } else {
        return '';
      }
    }
  }

}
