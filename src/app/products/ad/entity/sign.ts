export interface Sign {
  date: string;
  tagId: string,
  vendorPort: number;
  request: number | null;
  response: number | null;
  impression: number | null;
  click: number | null;
  cost: number | null;
  status: number;
}
