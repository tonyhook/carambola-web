import { Client } from './client';
import { ClientMedia } from './clientmedia';
import { ClientPort } from './clientport';
import { Vendor } from './vendor';
import { VendorMedia } from './vendormedia';
import { VendorPort } from './vendorport';

export interface PerformancePlaceholder {
  client: Client;
  vendor: Vendor;
  clientMedia: ClientMedia;
  vendorMedia: VendorMedia;
  clientPort: ClientPort;
  vendorPort: VendorPort;
  mode: number;
  format: string;
  budget: string;
  name: string;
  tagId: string;
}
