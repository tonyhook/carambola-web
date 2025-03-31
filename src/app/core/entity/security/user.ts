import { Role } from './role';

export interface User {
  id: number | null;
  username: string;
  password: string | null;
  enabled: boolean;
  createTime: string | null;
  updateTime: string | null;
  roles: Role[];
}
