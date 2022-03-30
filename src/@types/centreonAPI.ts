import { isoDateString } from './commons';

export interface CentreonList<T> {
  result: T[];
  meta: Meta;
}

export interface Meta {
  page: number;
  limit: number;
  search: unknown;
  sort_by: unknown;
  total: number;
}

export interface MBIResourceType {
  slug: string;
  display_name: string;
  list_endpoint: string;
}

export interface TimeSeriesMetric {
  id: number;
  name: string;
  unit: string;
  timeserie: Array<{ datetime: isoDateString; value: number }>;
}
