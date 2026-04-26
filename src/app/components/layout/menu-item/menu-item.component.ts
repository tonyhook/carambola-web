import { Component, computed, inject, input, OnInit, Signal } from '@angular/core';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { ActivatedRoute, NavigationExtras, Router } from '@angular/router';

import { MenuTreeNode } from '../../../core';
import { DrawerService } from '../../../services';

@Component({
  selector: 'carambola-admin-menu-item',
  imports: [
    MatListModule,
    MatIconModule,
  ],
  animations: [
    trigger('indicatorRotate', [
      state('collapsed', style({transform: 'rotate(0deg)'})),
      state('expanded', style({transform: 'rotate(180deg)'})),
      transition('expanded <=> collapsed',
        animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')
      ),
    ])
  ],
  templateUrl: './menu-item.component.html',
  styleUrls: ['./menu-item.component.scss'],
})
export class MenuItemComponent implements OnInit {
  public drawerService = inject(DrawerService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  onpath: Signal<boolean>;
  active: Signal<boolean>;
  disabled: Signal<boolean>;

  expanded = false;

  item = input.required<MenuTreeNode>();
  depth = input<number>(0);

  constructor() {
    this.onpath = computed(() => {
      if (this.isOnPath(this.item())) {
        return true;
      } else {
        this.expanded = false;
        return false;
      }
    });
    this.active = computed(() => {
      return this.isActive(this.item());
    });
    this.disabled = computed(() => {
      return this.item().disabled && this.item().children.length === 0;
    });
  }

  ngOnInit() {
    this.expanded = this.isOnPath(this.item());
  }

  isOnPath(item: MenuTreeNode): boolean {
    for (const child of item.children) {
      if (this.isOnPath(child) || this.isActive(child)) {
        return true;
      }
    }
    return false;
  }

  isActive(item: MenuTreeNode): boolean {
    if (item.link.length === 0) {
      return false;
    }
    const url = this.drawerService.currentUrl();
    if (url.indexOf(item.link) >= 0) {
      for (const child of item.children) {
        if (this.isActive(child)) {
          return false;
        }
      }
      return true;
    } else {
      return false;
    }
  }

  onItemSelected() {
    if (this.item().children.length === 0) {
      if (!this.item().disabled) {
        this.drawerService.close();

        const link = this.item().link.split('?')[0];
        const extras: NavigationExtras = {
          relativeTo: this.route,
        }
        if (this.item().link.indexOf('?') > 0) {
          extras.queryParams = {};
          const queryParams = this.item().link.split('?')[1];
          const params = new URLSearchParams(queryParams);
          params.forEach((value, key) => {
            if (extras.queryParams) {
              extras.queryParams[key] = value;
            }
          });
        }

        this.router.navigate([link], extras);
      }
    } else {
      if (this.drawerService.contentMode() === 'icon') {
        this.drawerService.open();
        this.expanded = true;
      } else {
        this.expanded = !this.expanded;
      }
    }
  }

}
