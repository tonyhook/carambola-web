export * from './client';
export * from './clientmedia';
export * from './clientport';
export * from './connection';
export * from './performance-partner';
export * from './performance-placeholder';
export * from './performance-view';
export * from './tenant-default';
export * from './tenant-user';
export * from './tenant';
export * from './traffic-control';
export * from './vendor';
export * from './vendormedia';
export * from './vendorport';

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
