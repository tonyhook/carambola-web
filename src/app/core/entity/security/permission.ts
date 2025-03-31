export interface Permission {
  id: number | null;
  resourceType: string;
  resourceId: number | null;
  roleId: number | null;
  permission: string | null;
}
