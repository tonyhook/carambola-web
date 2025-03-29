import { Injectable, signal, WritableSignal } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

import { Login, OpenSecurityAPI, UserDetails } from '../../core';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  credential: WritableSignal<UserDetails | null> = signal(null);
  redirectUrl = signal<string>('/admin');

  constructor(
    private router: Router,
    private security: OpenSecurityAPI,
    private snackBar: MatSnackBar,
  ) {
    this.getUserDetails();
  }

  getUserDetails(): void {
    this.security.getUserDetails().subscribe({
      next: data => {
        this.credential.set(data);

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
