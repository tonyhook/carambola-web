import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export const httpErrorInterceptor: HttpInterceptorFn = (request, next) => {
  const snackBar = inject(MatSnackBar);

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage;
      if (error.error instanceof ErrorEvent) {
        // client-side error
        errorMessage = `Error: ${error.error.message}`;
      } else {
        // server-side error
        if (error.status === 0) {
          errorMessage = 'Server Error';
        } else {
          errorMessage = error.message;
        }
        errorMessage = '后台服务错误';

        if (error.status === 401) {
          if (request.url.indexOf('/api/managed/') >= 0) {
            window.location.reload();
          }
        }
      }

      if (window.location.pathname.startsWith('/admin')) {
        snackBar.open(errorMessage, 'Dismiss', {
          duration: 3000,
        });
      }

      return throwError(() => error);
    })
  );
};
