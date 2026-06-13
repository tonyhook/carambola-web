import { Client } from './client';
import { ClientProject } from './client-project';

export interface ClientChannel {
  id: number | null;
  deleted: boolean;
  client: Client | null;
  clientProject: ClientProject | null;
  mediaName: string;
  mediaCode: string;
  mediaSecret: string | null;
  operator: string | null;
  filterInvalidId: boolean | null;
  cpc: number | null;
  remark: string | null;
  createTime: string | null;
  updateTime: string | null;
}
