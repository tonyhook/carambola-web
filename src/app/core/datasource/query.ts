export interface Query<T> {
  filter?: Partial<Record<keyof T | 'clientMode' | 'vendorMode', string[]>>;
  searchKey?: (keyof T)[];
  searchValue?: string;
  start?: string;
  end?: string;
}
