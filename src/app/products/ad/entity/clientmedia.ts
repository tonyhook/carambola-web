import { Client } from './client';

export interface ClientMedia {
  id: number | null;
  deleted: boolean;
  client: Client;
  name: string;
  platform: string;
  code: string | null;
  secret: string | null;
  apppackage: string | null;
  appversion: string | null;
  applink: string | null;
  remark: string | null;
  createTime: string | null;
  updateTime: string | null;
}
