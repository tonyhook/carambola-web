import { Tenant } from './tenant';

export interface Client {
  id: number | null;
  deleted: boolean;
  tenant: Tenant | null;
  name: string;
  remark: string | null;
  createTime: string | null;
  updateTime: string | null;
}
