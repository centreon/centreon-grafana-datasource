import { DataQuery, DataSourceJsonData, SelectableValue } from '@grafana/data';

import { EMode } from '../QueryEditor/EMode';

import { SavedFilter } from './SavedFilter';
import { MBIResourceType } from './centreonAPI';

export interface MyQuery extends DataQuery {
  filters?: Array<SavedFilter>;

  mode?: EMode;

  rawSelector?: string;
  resourceType?: SelectableValue<MBIResourceType>;
}

export const defaultQuery: Partial<MyQuery> = {
  rawSelector: 'host="berlin" metric="load"',
};

/**
 * Value that is used in the backend, but never sent over HTTP to the frontend
 */
export interface CentreonMetricSecureDatas {
  password?: string;
}

// use fixed numbers because they are stored ( start to 1, so it's true )
export enum EAccess {
  PROXY = 1,
  BROWSER = 2,
}

export interface CentreonMetricOptions extends DataSourceJsonData {
  access: EAccess;
  centreonURL: string;
  // only if using browser
  password?: string;
  username: string;
}

export enum ERoutes {
  API = '/centreon',
  LOGIN = '/centreon-login',
}

export interface CentreonLoginResult {
  contact: {
    alias: string;
    email: string;
    id: number;
    is_admin: boolean;
    name: string;
  };
  security: {
    token: string;
  };
}

export type TypeFilter = SelectableValue<MBIResourceType>;

export type StringOrArrayOfStrings =
  | undefined
  | string
  | Array<undefined | string>;
