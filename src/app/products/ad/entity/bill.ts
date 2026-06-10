export interface Bill {
  date: string;
  tagId: string,
  clientPort: number;
  request: number | null;
  response: number | null;
  impression: number | null;
  click: number | null;
  cost: number | null;
  status: number;
}
