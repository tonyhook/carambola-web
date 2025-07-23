import { Component, OnInit, signal, WritableSignal, inject } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';

import { Menu, MenuAPI } from '../../../../core';
import { MenuService } from '../../../../services';
import { ItemChangeEvent, ItemDeleteEvent, ItemNewEvent, ItemSelectEvent, TreeViewComponent, PermissionComponent } from '../../../../shared';

@Component({
  selector: 'carambola-menu-manager',
  imports: [
    ReactiveFormsModule,
    MatDividerModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatTabsModule,
    TreeViewComponent,
    PermissionComponent,
  ],
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss'],
})
export class MenuManagerComponent implements OnInit {
  private formBuilder = inject(UntypedFormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private menuService = inject(MenuService);
  private menuAPI = inject(MenuAPI);

  menus: WritableSignal<Menu[]> = signal([]);
  menu: WritableSignal<Menu | null> = signal(null);
  formGroup: UntypedFormGroup;

  constructor() {
    this.formGroup = this.formBuilder.group({});
  }

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.menuAPI.getMenuList().subscribe(data => {
        this.menus.set(data);

        if (params['id'] !== null) {
          this.setCurrentMenu(+params['id']);
        } else {
          this.menu.set(null);
        }
      });
    });
  }

  setCurrentMenu(id: number) {
    const menus = this.menus();
    if (menus.length === 0) {
      return;
    }

    const menu = menus.find(menu => menu.id === id);

    if (typeof menu !== 'undefined' && menu.id) {
      this.menu.set(menu);

      this.formGroup = this.formBuilder.group({
        'name': [menu.name, Validators.required],
        'icon': [menu.icon, null],
        'link': [menu.link, null],
        'disabled': [menu.disabled, null],
      });
    } else {
      this.router.navigate(['admin', 'backend', 'menu']);
    }
  }

  changeMenuItem(event: ItemChangeEvent) {
    const menus = this.menus();
    if (menus.length === 0) {
      return;
    }

    const menu = menus.find(menu => menu.id === event.id);

    if (typeof menu !== 'undefined' && menu.id) {
      if (event.type === 'sequence') {
        if (event.newValue !== null) {
          menu.sequence = event.newValue;
        } else {
          menu.sequence = 0;
        }
      }
      if (event.type === 'parent') {
        menu.parentId = event.newValue;
      }

      this.menuAPI.updateMenu(menu.id, menu).subscribe(() => {
        this.menus.update(menus => [...menus]);
        this.menuService.update();
      });
    }
  }

  selectMenuItem(event: ItemSelectEvent) {
    this.router.navigate(['admin', 'backend', 'menu', event.id]);
  }

  newMenuItem(event: ItemNewEvent) {
    const menu: Menu = {
      id: null,
      ownerId: null,
      name: event.name,
      parentId: event.parentId,
      sequence: event.sequence,
      icon: null,
      link: null,
      disabled: true,
      createTime: null,
      updateTime: null
    }

    this.menuAPI.addMenu(menu).subscribe(data => {
      const menu = data;

      this.menus.update(menus => [...menus, menu]);
      this.menuService.update();

      if (menu.id) {
        this.selectMenuItem({ id: menu.id });
      }
    });
  }

  deleteMenuItem(event: ItemDeleteEvent) {
    const menus = this.menus();

    const menu = menus.find(menu => menu.id === event.id);

    if (typeof menu !== 'undefined' && menu.id) {
      this.menuAPI.removeMenu(menu.id).subscribe(() => {
        this.menus.update(menus => menus.filter(m => m.id !== menu.id));
        this.menuService.update();

        if (menu.parentId) {
          this.router.navigate(['admin', 'backend', 'menu', menu.parentId]);
        } else {
          this.router.navigate(['admin', 'backend', 'menu']);
        }
      });
    }
  }

  updateMenuItem() {
    if (!this.formGroup.valid) {
      this.formGroup.markAllAsTouched();
      return;
    }

    const menu = this.menu();

    if (menu && menu.id) {
      menu.name = this.formGroup.value.name;
      menu.icon = this.formGroup.value.icon;
      menu.link = this.formGroup.value.link;
      menu.disabled = this.formGroup.value.disabled;
      this.menuAPI.updateMenu(menu.id, menu).subscribe(() => {
        this.menus.update(menus => [...menus]);
        this.menuService.update();
      });
    }
  }

}
