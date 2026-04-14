import { Connection } from './connection';
import { Vendor } from './vendor';
import { VendorMedia } from './vendormedia';

export interface VendorPort {
  id: number | null;
  deleted: boolean;
  vendor: Vendor;
  vendorMedia: VendorMedia;
  name: string;
  format: string;
  budget: string;
  tagId: string;
  mode: number;
  timeout: number;
  remark: string | null;
  createTime: string | null;
  updateTime: string | null;
  connection: Connection[];
}
