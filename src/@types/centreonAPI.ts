export interface CentreonList<T> {
  result: Array<T>;
  meta: Meta;
}

export interface Meta {
  page: number;
  limit: number;
  search: unknown;
  sort_by: unknown;
  total: number;
}
