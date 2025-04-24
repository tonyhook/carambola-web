import { Tenant } from './tenant';

export interface Vendor {
  id: number | null;
  deleted: boolean;
  tenant: Tenant;
  name: string;
  mode: number;
  ekey: string | null;
  ikey: string | null;
  remark: string | null;
  createTime: string | null;
  updateTime: string | null;
}
