import { isoDateString } from './commons';

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

export interface ITimeSeriesMetric {
  id: number;
  name: string;
  unit: string;
  timeserie: Array<{ datetime: isoDateString; value: number }>;
}
