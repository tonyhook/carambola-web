import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';

import { DrawerService } from '../../../services';

import { MenuComponent } from '../menu/menu.component';

@Component({
  selector: 'carambola-admin-main',
  imports: [
    RouterModule,
    MatIconModule,
    MatSidenavModule,
    MenuComponent,
  ],
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss'],
})
export class MainComponent {
  public drawerService = inject(DrawerService);

}
