import { Query } from '../../core';

export type AdQuery<T> = Query<T, AdFilterKey>;

export type AdFilterKey =
  | 'clientMode'
  | 'vendorMode'
  | 'platform';
