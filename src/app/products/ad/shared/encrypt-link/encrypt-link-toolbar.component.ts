import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'carambola-ad-encrypt-link-toolbar',
  imports: [
    MatButtonModule,
    MatIconModule,
    RouterLink,
  ],
  template: '<button mat-button routerLink="/admin/ad/encrypt"><mat-icon>calculate</mat-icon>加密计算器</button>',
})
export class EncryptLinkToolbarComponent { }
