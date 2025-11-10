import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';

@Component({
  selector: 'carambola-ad-document-link-menu',
  imports: [
    MatIconModule,
    MatMenuModule,
  ],
  template: '<button mat-menu-item (click)="downloadDocument()"><mat-icon>book_2</mat-icon>协议文档</button>',
})
export class DocumentLinkMenuComponent {
  downloadDocument() {
    const a = document.createElement('a');
    a.href = 'assets/ad/carambola.pdf';
    a.download = 'carambola.pdf';
    a.click();
  }
}
