import { Injectable, signal, WritableSignal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

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

  credential: WritableSignal<UserDetails | null> = signal(null);
  redirectUrl = signal<string>('/admin');

  constructor() {
    this.getUserDetails();
  }

  getUserDetails(): void {
    this.security.getUserDetails().subscribe({
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
    this.security.login(post).subscribe({
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
    this.security.logout().subscribe({
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
