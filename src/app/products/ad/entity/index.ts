export * from './bill-rule';
export * from './bill-view';
export * from './bill';
export * from './client';
export * from './clientmedia';
export * from './clientport';
export * from './connection';
export * from './medium';
export * from './performance-partner';
export * from './performance-placeholder';
export * from './performance-view';
export * from './sign';
export * from './tenant-default';
export * from './tenant-user';
export * from './tenant';
export * from './traffic-control';
export * from './upload';
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
export enum BillStatus {
  BILL_STATUS_IGNORE   = -1,
  BILL_STATUS_PENDING  = 0,
  BILL_STATUS_FETCHED  = 1,
  BILL_STATUS_UPLOADED = 2,
  BILL_STATUS_MANUAL   = 3,
};
export enum BillViewStatus {
  BILL_STATUS_UNBILLED = 0,
  BILL_STATUS_BILLED   = 1,
};
export enum SignStatus {
  SIGN_STATUS_IGNORE  = -1,
  SIGN_STATUS_PENDING = 0,
  SIGN_STATUS_READY   = 1,
  SIGN_STATUS_CREATED = 2,
  SIGN_STATUS_SIGNED  = 3,
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
