import { ClientChannel } from './client-channel';

export interface ClientChannelRoute {
  id: number | null;
  clientChannel: ClientChannel | null;
  event: string;
  trackName: string;
  trackCode: string | null;
  deleted: boolean;
  createTime: string | null;
  updateTime: string | null;
}

export interface ClientChannelRouteView {
  id: number;
  clientChannelId: number;
  event: string;
  trackName: string;
  trackCode: string | null;
}
