import { ManagedResource } from './managed-resource';

export interface SequenceManagedResource extends ManagedResource {
  sequence: number;
}
