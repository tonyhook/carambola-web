export interface Track {
  id: number | null;
  deleted: boolean;
  name: string;
  code: string | null;
  protocolKey: string[];
  remark: string | null;
  createTime: string | null;
  updateTime: string | null;
}
