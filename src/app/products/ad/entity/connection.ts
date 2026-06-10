import { ClientPort } from './clientport';
import { VendorPort } from './vendorport';

export interface Connection {
  id: number | null;
  deleted: boolean;
  priority: number;
  enabled: boolean;
  test: boolean;
  validFrom: string;
  validTo: string;
  clientPort: ClientPort;
  vendorPort: VendorPort;
  upstreamRatio: number;
  rebateRatio: number;
  platformRatio: number;
  downstreamRatio: number;
  defaultPrice: number;
}
