export * from './client';
export * from './clientmedia';
export * from './clientport';
export * from './connection';
export * from './tenant-default';
export * from './tenant-user';
export * from './tenant';
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
