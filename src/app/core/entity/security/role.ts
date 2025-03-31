import { Authority } from './authority';

export interface Role {
  id: number | null;
  name: string;
  createTime: string | null;
  updateTime: string | null;
  authorities: Authority[];
}
