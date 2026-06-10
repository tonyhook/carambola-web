import { Tenant } from './tenant';

export interface Client {
  id: number | null;
  deleted: boolean;
  tenant: Tenant;
  name: string;
  mode: number;
  code: string;
  protocolKey: string[];
  remark: string | null;
  createTime: string | null;
  updateTime: string | null;
}
