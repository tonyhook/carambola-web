import { InjectionToken, Type } from '@angular/core';

export interface HeaderExtension {
  toolbarComponent?: Type<unknown>;
  menuComponent?: Type<unknown>;
}

export const HEADER_EXTENSIONS = new InjectionToken<HeaderExtension[]>('HEADER_EXTENSIONS', {
  factory: () => [],
});
