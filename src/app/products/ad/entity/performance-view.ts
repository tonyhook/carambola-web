export interface PerformanceView {
  time: string;
  start: Date;
  end: Date;
  client: number;
  vendor: number;
  clientMedia: number;
  vendorMedia: number;
  clientPort: number;
  vendorPort: number;
  bundle?: string;
  request: number;
  requestv: number;
  response: number;
  responsev: number;
  impression: number;
  click: number;
  income: number;
  outcomeUpstream: number;
  outcomeRebate: number;
  outcomeDownstream: number;
  offer: number;
}
