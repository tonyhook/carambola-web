export interface TenantUser {
  id: number | null;
  username: string;
  role: number;
  resource: number | null;
}
export const ROLE_TENANT_MANAGER                         = 1 << 0 << 0;
export const ROLE_TENANT_OPERATOR                        = 1 << 1 << 0;
export const ROLE_TENANT_OBSERVER                        = 1 << 2 << 0;
export const ROLE_TENANT_UPSTREAM_OBSERVER_DIRECT        = 1 << 0 << 12;
export const ROLE_TENANT_UPSTREAM_OBSERVER_PROGRAMMATIC  = 1 << 1 << 12;
export const ROLE_TENANT_DOWNSTREAM_MANAGER_DIRECT       = 1 << 0 << 16;
export const ROLE_TENANT_DOWNSTREAM_MANAGER_PROGRAMMATIC = 1 << 1 << 16;
