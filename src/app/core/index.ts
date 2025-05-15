export * from './api/open/application.api';
export * from './api/open/security.api';
export * from './api/managed/menu.api';
export * from './api/managed/authority.api';
export * from './api/managed/permission.api';
export * from './api/managed/role.api';
export * from './api/managed/user.api';
export * from './api/managed/log.api';

export * from './api/managed/client.api';
export * from './api/managed/clientmedia.api';
export * from './api/managed/clientport.api';
export * from './api/managed/connection.api';
export * from './api/managed/tenant.api';
export * from './api/managed/vendor.api';
export * from './api/managed/vendormedia.api';
export * from './api/managed/vendorport.api';
export * from './api/managed/performance.api';
export * from './api/managed/traffic-control.api';

export * from './datasource/paginated-data-source';
export * from './datasource/query';

export * from './entity/managed-resource';
export * from './entity/sequence-managed-resource';
export * from './entity/hierarchy-managed-resource';
export * from './entity/contained-managed-resource';

export * from './entity/backend/site';
export * from './entity/backend/menu';
export * from './entity/backend/menu-tree-node';
export * from './entity/security/login';
export * from './entity/security/user-details';
export * from './entity/security/authority';
export * from './entity/security/permission';
export * from './entity/security/role';
export * from './entity/security/user';
export * from './entity/audit/log';

export * from './entity/ad/client';
export * from './entity/ad/clientmedia';
export * from './entity/ad/clientport';
export * from './entity/ad/connection';
export * from './entity/ad/tenant';
export * from './entity/ad/tenant-default';
export * from './entity/ad/tenant-user';
export * from './entity/ad/vendor';
export * from './entity/ad/vendormedia';
export * from './entity/ad/vendorport';
export * from './entity/ad/performance-partner';
export * from './entity/ad/performance-placeholder';
export * from './entity/ad/performance-view';
export * from './entity/ad/traffic-control';

export enum PartnerType {
  PARTNER_TYPE_UNKNOWN      = -1,
  PARTNER_TYPE_DIRECT       = 0,
  PARTNER_TYPE_PROGRAMMATIC = 1,
}
export enum PortType {
  PORT_TYPE_UNKNOWN = -1,
  PORT_TYPE_SHARE   = 1,
  PORT_TYPE_BIDDING = 2,
  PORT_TYPE_DIRECT  = 3,
}
export enum TrafficControlIndicator {
  TC_INDICATOR_REQUEST = 1,
  TC_INDICATOR_COST    = 2,
}
export enum TrafficControlPeriod {
  TC_PERIOD_SECOND = 1,
  TC_PERIOD_MINUTE = 2,
  TC_PERIOD_HOUR   = 3,
  TC_PERIOD_DAY    = 4,
}
