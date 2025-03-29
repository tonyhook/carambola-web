import { Injectable, OnDestroy, signal } from '@angular/core';
import { MatDrawerMode } from '@angular/material/sidenav';
import { BreakpointObserver, Breakpoints, BreakpointState } from '@angular/cdk/layout';
import { Event, NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DrawerService implements OnDestroy {
  drawerMode: MatDrawerMode = 'over';
  drawerOpen = true;

  screenMode = signal<string>('large');
  contentMode = signal<string>('full');
  currentUrl = signal<string>('');
  watcher: Subscription;
  activeMediaQuery = '';

  constructor(
    breakpointObserver: BreakpointObserver,
    private router: Router,
  ) {
    this.router.events.subscribe((event: Event) => {
      if (event instanceof NavigationEnd) {
        this.currentUrl.set(event.urlAfterRedirects);
      }
    });
    const layoutChanges = breakpointObserver.observe([
      Breakpoints.XSmall,
      Breakpoints.Small,
      Breakpoints.Medium,
      Breakpoints.Large,
      Breakpoints.XLarge,
    ]);
    this.watcher = layoutChanges.subscribe((result: BreakpointState) => {
      for (const query of Object.keys(result.breakpoints)) {
        if (result.breakpoints[query]) {
          if (query === Breakpoints.XSmall) {
            this.screenMode.set('small');
            this.drawerMode = 'over';
            this.drawerOpen = false;
          } else if (query === Breakpoints.Small) {
            this.screenMode.set('medium');
            this.contentMode.set('icon');
            this.drawerMode = 'side';
            this.drawerOpen = true;
          } else if ((query === Breakpoints.Medium) || (query === Breakpoints.Large) || (query === Breakpoints.XLarge)) {
            this.screenMode.set('large');
            this.contentMode.set('full');
            this.drawerMode = 'side';
            this.drawerOpen = true;
          }
        }
      }
    });
  }

  toggle(): void {
    if (this.screenMode() === 'small') {
      this.drawerOpen = !this.drawerOpen;
      if (this.drawerOpen) {
        this.contentMode.set('full');
      }
    }
    if (this.screenMode() === 'medium') {
      if (this.contentMode() === 'icon') {
        this.contentMode.set('full');
        this.drawerMode = 'over';
      } else {
        this.contentMode.set('icon');
        this.drawerMode = 'side';
      }
    }
  }

  open() {
    if (this.screenMode() === 'small') {
      this.drawerOpen = true;
    }
    if (this.screenMode() === 'medium') {
      this.contentMode.set('full');
      this.drawerMode = 'over';
    }
  }

  close() {
    if (this.screenMode() === 'small') {
      this.drawerOpen = false;
    }
    if (this.screenMode() === 'medium') {
      this.contentMode.set('icon');
      this.drawerMode = 'side';
    }
  }

  hasBackdrop(): boolean {
    return this.drawerMode !== 'side';
  }

  isOpen(): boolean {
    return this.drawerOpen;
  }

  getMode(): MatDrawerMode {
    return this.drawerMode;
  }

  ngOnDestroy() {
    this.watcher.unsubscribe();
  }

}
