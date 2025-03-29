import { Component, ViewChild, ElementRef } from '@angular/core';
import { MatListModule } from '@angular/material/list';

import { MenuService } from '../../../services';

import { MenuItemComponent } from '../menu-item/menu-item.component';

@Component({
  selector: 'carambola-admin-menu',
  imports: [
    MatListModule,
    MenuItemComponent,
  ],
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss'],
})
export class MenuComponent {
  @ViewChild('appDrawer') appDrawer?: ElementRef;

  constructor(
    public menuService: MenuService,
  ) { }

}
