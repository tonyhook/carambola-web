import { Client } from './client';
import { TenantUser } from './tenant-user';
import { Vendor } from './vendor';

export interface Tenant {
  id: number | null;
  name: string;
  enabled: boolean;
  createTime: string | null;
  updateTime: string | null;
  user: TenantUser[];
  client: Client[];
  vendor: Vendor[];
}
