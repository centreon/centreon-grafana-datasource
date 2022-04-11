import { isoDateString } from './commons';

export interface CentreonList<T> {
  meta: Meta;
  result: Array<T>;
}

export interface Meta {
  limit: number;
  page: number;
  search: unknown;
  sort_by: unknown;
  total: number;
}

export interface MBIResourceType {
  display_name: string;
  list_endpoint: string;
  slug: string;
}

export interface TimeSeriesMetric {
  id: number;
  name: string;
  timeserie: Array<{ datetime: isoDateString; value: number }>;
  unit: string;
}

export type ApiErrorOrGrafanaProxyError = APIError | GrafanaProxyError;

export interface APIError {
  code: number;
  message: string;
}

export interface GrafanaProxyError {
  error: string;
  message: string;
  response: string;
}
