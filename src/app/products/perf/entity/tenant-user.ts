export interface TenantUser {
  id: number | null;
  username: string;
  role: number;
  resource: number | null;
}

export const ROLE_TENANT_MANAGER         = 1 << 0 << 0;
export const ROLE_CLIENT_MANAGER         = 1 << 0 << 12;
export const ROLE_CLIENT_PROJECT_MANAGER = 1 << 0 << 16;
