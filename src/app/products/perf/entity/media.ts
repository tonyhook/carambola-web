export interface Media {
  id: number | null;
  deleted: boolean;
  name: string;
  code: string | null;
  protocolKey: string[];
  secretKey: string[];
  remark: string | null;
  createTime: string | null;
  updateTime: string | null;
}
