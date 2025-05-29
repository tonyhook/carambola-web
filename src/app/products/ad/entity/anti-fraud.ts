export interface AntiFraud {
  id: number | null;
  clientPort: number | null;
  rule: string;
  period: number;
  limitation: number;
}
