import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { MatIconRegistry } from '@angular/material/icon';

@Component({
  selector: 'carambola-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  private matIconReg = inject(MatIconRegistry);

  ngOnInit(): void {
    this.matIconReg.setDefaultFontSetClass('material-symbols-outlined');
  }

}
