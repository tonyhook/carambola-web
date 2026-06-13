export interface CountView {
  time: string;
  clientId: number | null;
  clientName: string | null;
  clientProjectId: number | null;
  clientProjectName: string | null;
  media: string | null;
  mediaCode: string | null;
  operator: string | null;
  clientChannelId: number | null;
  spend: number;
  eventCounts: Record<string, number>;
  eventUserCounts: Record<string, number>;
  eventRawCounts: Record<string, number>;
  eventAmounts: Record<string, number>;
  eventNames: Record<string, string>;
}
