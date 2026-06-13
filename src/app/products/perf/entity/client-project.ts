import { Client } from './client';

export interface ClientProject {
  id: number | null;
  deleted: boolean;
  client: Client | null;
  name: string;
  remark: string | null;
  createTime: string | null;
  updateTime: string | null;
}
