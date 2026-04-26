import { DestroyRef, inject, Injectable, signal, WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

import { Login, OpenSecurityAPI, UserDetails } from '../../core';
import { MenuService } from '../../services';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private router = inject(Router);
  private menuService = inject(MenuService);
  private security = inject(OpenSecurityAPI);
  private snackBar = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);

  credential: WritableSignal<UserDetails | null> = signal(null);
  redirectUrl = signal<string>('/admin');

  constructor() {
    this.getUserDetails();
  }

  getUserDetails(): void {
    this.security.getUserDetails().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: data => {
        this.credential.set(data);

        if (data !== null) {
          this.menuService.update();
        }

        this.router.navigateByUrl(this.redirectUrl());
      },
      error: () => {
        this.snackBar.open('Failed to get credential', 'Dismiss', {
          duration: 3000,
        });
      },
    });
  }

  login(post: Login) {
    this.security.login(post).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.getUserDetails();
        this.router.navigate(['/admin/pending']);
      },
      error: error => {
        if (error.status === 0) {
          this.snackBar.open(error.statusText, 'Dismiss', {
            duration: 3000,
          });
        } else {
          this.snackBar.open(error.error, 'Dismiss', {
            duration: 3000,
          });
        }
      },
    });
  }

  logout() {
    this.security.logout().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.getUserDetails();
        this.redirectUrl.set('/admin');
        this.router.navigate(['/admin/login']);
      },
      error: error => {
        if (error.status === 0) {
          this.snackBar.open(error.statusText, 'Dismiss', {
            duration: 3000,
          });
        } else {
          this.snackBar.open(error.error, 'Dismiss', {
            duration: 3000,
          });
        }
      },
    });
  }

}
