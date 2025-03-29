export interface ManagedResource {
  id: number | null;
  ownerId: number | null;
  name: string;
  disabled: boolean;
  createTime: string | null;
  updateTime: string | null;
}
