export interface Medium {
  date: string;
  clientPort: number;
  vendorPort: number;
  request: number | null;
  response: number | null;
  impression: number | null;
  click: number | null;
  income: number | null;
  outcomeUpstream: number | null;
  outcomeRebate: number | null;
  outcomeDownstream: number | null;
}
