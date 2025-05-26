export interface Server {
  id: number | null;
  domain: string;
  address: string;
  node: number;
  username: string;
  password: string;
  servingTimestamp?: string;
  servingVersion?: string;
  trackingTimestamp?: string;
  trackingVersion?: string;
  updateTimestamp?: string;
}
