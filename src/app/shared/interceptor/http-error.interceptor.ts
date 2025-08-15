import { Injectable } from '@angular/core';
import { HttpEvent, HttpInterceptor, HttpHandler, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';

import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class HttpErrorInterceptor implements HttpInterceptor {

  constructor(
    private snackBar: MatSnackBar,
  ) { }

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(request).pipe(
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

          if (error.status === 401) {
            if (request.url.indexOf('/api/managed/') >= 0) {
              window.location.reload();
            }
          }
        }

        if (window.location.pathname.startsWith('/admin')) {
          this.snackBar.open(errorMessage, 'Dismiss', {
            duration: 3000,
          });
        }

        return throwError(() => error);
      })
    );
  }

}
