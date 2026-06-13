export interface PerfEventOption {
  event: string;
  category: string;
  name: string;
}

export interface PerfEventOptions {
  events: PerfEventOption[];
  defaultEvent: string;
}
