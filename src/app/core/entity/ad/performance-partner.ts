export interface PerformancePartner {
  id: number | null;
  clientPort: number;
  vendorPort: number;
  bundle: string;
  time: string;
  eventA: number;
  eventB: number;
  eventC: number;
  eventD: number;
  eventE: number;
  eventF: number;
  eventG: number;
  eventH: number;
  eventI: number;
  eventJ: number;
  eventK: number;
  eventL: number;
  eventM: number;
  eventN: number;
  eventO: number;
  eventP: number;
  general: Record<string, number>;
  impression: number;
  click: number;
  income: number;
  outcomeUpstream: number
  outcomeRebate: number;
  outcomeDownstream: number;
  offer: number;
}
