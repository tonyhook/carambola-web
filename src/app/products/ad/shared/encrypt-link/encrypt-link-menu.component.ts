import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'carambola-ad-encrypt-link-menu',
  imports: [
    MatIconModule,
    MatMenuModule,
    RouterLink,
  ],
  template: '<button mat-menu-item routerLink="/admin/ad/encrypt"><mat-icon>calculate</mat-icon>加密计算器</button>',
})
export class EncryptLinkMenuComponent { }
