import { Injectable, signal, WritableSignal } from '@angular/core';

import { MenuTreeNode } from '../../core';

@Injectable({
  providedIn: 'root',
})
export class MenuService {
  menuItems: WritableSignal<MenuTreeNode[]> = signal([]);

}
