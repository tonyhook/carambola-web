import { Client } from './client';
import { ClientMedia } from './clientmedia';
import { Connection } from './connection';

export interface ClientPort {
  id: number | null;
  deleted: boolean;
  client: Client;
  clientMedia: ClientMedia;
  name: string;
  format: string;
  tagId: string;
  mode: number;
  ekey: number | null;
  ikey: number | null;
  appname: string | null;
  apppackage: string | null;
  filter: string | null;
  filterType: string | null;
  remark: string | null;
  createTime: string | null;
  updateTime: string | null;
  connection: Connection[];
}
