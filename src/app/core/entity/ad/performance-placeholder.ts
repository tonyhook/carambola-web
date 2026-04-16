import { Client, ClientMedia, ClientPort, Vendor, VendorMedia, VendorPort } from '../..';

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
