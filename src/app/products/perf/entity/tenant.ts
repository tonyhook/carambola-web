import { Client } from './client';
import { TenantUser } from './tenant-user';

export interface Tenant {
  id: number | null;
  client: Client[];
  name: string;
  enabled: boolean;
  user: TenantUser[];
  createTime: string | null;
  updateTime: string | null;
}
