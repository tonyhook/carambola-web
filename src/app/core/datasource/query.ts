export interface Query<T, ExtraFilterKey extends string = never> {
  filter?: Partial<Record<keyof T | ExtraFilterKey, string[]>>;
  searchKey?: (keyof T | ExtraFilterKey)[];
  searchValue?: string;
  start?: string;
  end?: string;
}
