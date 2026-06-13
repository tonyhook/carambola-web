import { Tenant } from './tenant';

export interface TenantDefault {
  id: number | null;
  username: string;
  tenant: Tenant;
}
