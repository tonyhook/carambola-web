export interface EventView {
  id: number;
  time: string;
  event: string;
  eventName: string;
  amount: number | null;
  media: string | null;
  mediaCode: string | null;
  operator: string | null;
  forwarded: boolean | null;
  forwardSucceeded: boolean | null;
  queries: Record<string, string>;
}
