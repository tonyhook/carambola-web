import { inject, Injectable, signal, WritableSignal } from '@angular/core';

import { Menu, MenuAPI, MenuTreeNode } from '../../core';

@Injectable({
  providedIn: 'root',
})
export class MenuService {
  private menuAPI = inject(MenuAPI);

  menuItems: WritableSignal<MenuTreeNode[]> = signal([]);

  transform(el: Menu): MenuTreeNode {
    const menu: MenuTreeNode = {
      id: el.id === null ? 0 : el.id,
      name: el.name,
      sequence: el.sequence ? el.sequence : 0,
      icon: el.icon === null ? '' : el.icon,
      link: el.link === null ? '' : el.link,
      disabled: el.disabled,
      parent: null,
      children: [],
    }
    return menu;
  }

  update() {
    this.menuAPI.getMenuList().subscribe(data => {
      const menuItems: MenuTreeNode[] = [];
      const idMapping = data.reduce((acc: number[], el, i) => {
        if (el.id) {
          acc[el.id] = i;
        }
        return acc;
      }, []);
      const newMenu = data.reduce((acc: MenuTreeNode[], el, i) => {
        acc[i] = this.transform(el);
        return acc;
      }, []);

      data.forEach((el, i) => {
        if ((el.parentId === null) || (idMapping[el.parentId] === null)) {
          menuItems.push(newMenu[i]);
          menuItems.sort(function(a, b) {return a.sequence - b.sequence});
        } else {
          const parentEl = newMenu[idMapping[el.parentId]];
          newMenu[i].parent = parentEl;
          parentEl.children = [...(parentEl.children || []), newMenu[i]];
          parentEl.children.sort(function(a, b) {return a.sequence - b.sequence});
        }
      });

      this.menuItems.set(menuItems);
    });
  }

}
