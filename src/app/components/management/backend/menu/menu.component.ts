import { Component, DestroyRef, inject, OnInit, signal, WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { ActivatedRoute, Router } from '@angular/router';

import { Menu, MenuAPI } from '../../../../core';
import { MenuService } from '../../../../services';
import { ItemChangeEvent, ItemDeleteEvent, ItemNewEvent, ItemSelectEvent, PermissionComponent, TreeViewComponent } from '../../../../shared';

type MenuFormGroup = FormGroup<{
  name: FormControl<string>;
  icon: FormControl<string | null>;
  link: FormControl<string | null>;
  disabled: FormControl<boolean>;
}>;

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
  private destroyRef = inject(DestroyRef);
  private formBuilder = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private menuService = inject(MenuService);
  private menuAPI = inject(MenuAPI);

  menus: WritableSignal<Menu[]> = signal([]);
  menu: WritableSignal<Menu | null> = signal(null);
  formGroup: MenuFormGroup;

  constructor() {
    this.formGroup = this.formBuilder.group({
      name: this.formBuilder.nonNullable.control('', Validators.required),
      icon: this.formBuilder.control<string | null>(null),
      link: this.formBuilder.control<string | null>(null),
      disabled: this.formBuilder.nonNullable.control(false),
    });
  }

  ngOnInit() {
    this.route.params.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
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
        name: this.formBuilder.nonNullable.control(menu.name, Validators.required),
        icon: this.formBuilder.control<string | null>(menu.icon),
        link: this.formBuilder.control<string | null>(menu.link),
        disabled: this.formBuilder.nonNullable.control(menu.disabled),
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
      const menuId = menu.id;
      const nextMenu = {...menu};
      if (event.type === 'sequence') {
        if (event.newValue !== null) {
          nextMenu.sequence = event.newValue;
        } else {
          nextMenu.sequence = 0;
        }
      }
      if (event.type === 'parent') {
        nextMenu.parentId = event.newValue;
      }

      this.menuAPI.updateMenu(menuId, nextMenu).subscribe(() => {
        this.menus.update(menus => menus.map(menu => menu.id === menuId ? {...nextMenu} : menu));
        if (this.menu()?.id === menuId) {
          this.menu.set({...nextMenu});
        }
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
      const menuId = menu.id;
      const nextMenu = {
        ...menu,
        name: this.formGroup.controls.name.value,
        icon: this.formGroup.controls.icon.value,
        link: this.formGroup.controls.link.value,
        disabled: this.formGroup.controls.disabled.value,
      };
      this.menuAPI.updateMenu(menuId, nextMenu).subscribe(() => {
        this.menu.set({...nextMenu});
        this.menus.update(menus => menus.map(menu => menu.id === menuId ? {...nextMenu} : menu));
        this.menuService.update();
      });
    }
  }

}
