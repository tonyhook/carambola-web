import { HierarchyManagedResource } from '../hierarchy-managed-resource';

export interface Menu extends HierarchyManagedResource {
  icon: string | null;
  link: string | null;
}
