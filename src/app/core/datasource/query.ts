export interface Query<T, ExtraFilterKey extends string = never> {
  filter?: Partial<Record<keyof T | ExtraFilterKey, string[]>>;
  searchKey?: (keyof T)[];
  searchValue?: string;
  start?: string;
  end?: string;
}
