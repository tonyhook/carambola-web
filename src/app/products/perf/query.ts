import { Query } from '../../core';

export type PerfQuery<T> = Query<T, PerfFilterKey>;

export type PerfFilterKey =
  | 'tenant'
  | 'client'
  | 'clientProject'
  | 'media'
  | 'trackName'
  | 'trackCode';
