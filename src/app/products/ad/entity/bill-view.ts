export interface BillView {
  time: string;
  start: Date;
  end: Date;
  client: number;
  vendor: number;
  clientMedia: number;
  vendorMedia: number;
  clientPort: number;
  vendorPort: number;
  request: number | null;
  response: number | null;
  impression: number | null;
  click: number | null;
  cost: number | null;
  status: number;
  closed: number;
  total: number;
}
