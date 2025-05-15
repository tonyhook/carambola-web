export interface TrafficControl {
  id: number | null;
  clientPort: number | null;
  vendorPort: number | null;
  bundle: string;
  indicator: number;
  period: number;
  limitation: number;
}
