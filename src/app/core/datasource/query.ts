export interface Query<T> {
  filter?: Partial<Record<keyof T | 'clientMode' | 'vendorMode' | 'platform', string[]>>;
  searchKey?: (keyof T)[];
  searchValue?: string;
  start?: string;
  end?: string;
}
