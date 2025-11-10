import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'carambola-ad-document-link-toolbar',
  imports: [
    MatButtonModule,
    MatIconModule,
  ],
  template: '<button mat-button (click)="downloadDocument()"><mat-icon>book_2</mat-icon>协议文档</button>',
})
export class DocumentLinkToolbarComponent {
  downloadDocument() {
    const a = document.createElement('a');
    a.href = 'assets/ad/carambola.pdf';
    a.download = 'carambola.pdf';
    a.click();
  }
}
