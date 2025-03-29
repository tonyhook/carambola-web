import { SequenceManagedResource } from './sequence-managed-resource';

export interface ContainedManagedResource extends SequenceManagedResource {
  containerType: string | null;
  containerId: number | null;
}
