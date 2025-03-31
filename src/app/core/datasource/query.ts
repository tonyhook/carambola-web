export interface Query<T> {
  filter?: Partial<Record<keyof T, string[]>>;
  searchKey?: (keyof T)[];
  searchValue?: string;
  start?: string;
  end?: string;
}
