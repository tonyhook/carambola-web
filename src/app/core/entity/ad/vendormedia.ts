import { Vendor } from './vendor';

export interface VendorMedia {
  id: number | null;
  deleted: boolean;
  vendor: Vendor;
  name: string;
  platform: string;
  apppackage: string;
  appversion: string;
  applink: string;
  remark: string | null;
  createTime: string | null;
  updateTime: string | null;
}
