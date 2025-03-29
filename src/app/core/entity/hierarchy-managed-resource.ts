import { SequenceManagedResource } from './sequence-managed-resource';

export interface HierarchyManagedResource extends SequenceManagedResource {
  parentId: number | null;
}
