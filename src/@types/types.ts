import { DataQuery, DataSourceJsonData, SelectableValue } from '@grafana/data';
import { ISavedFilter } from './ISavedFilter';

export interface MyQuery extends DataQuery {
  selector?: string;
  resource?: SelectableValue<string>;

  rawSelector?: string;
  filters?: Array<ISavedFilter>;
}

export const defaultQuery: Partial<MyQuery> = {
  selector: 'host:berlin metric:load',
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
  centreonURL: string;
  username: string;
  access: EAccess;
  //only if using browser
  password?: string;
}

export enum ERoutes {
  LOGIN = '/centreon-login',
  API = '/centreon',
}

export interface MyVariableQuery {
  resource?: SelectableValue<string>;
  filters?: Array<ISavedFilter>;
}

export interface CentreonLoginResult {
  contact: {
    id: number;
    name: string;
    alias: string;
    email: string;
    is_admin: boolean;
  };
  security: {
    token: string;
  };
}

export type tFilter = ISavedFilter & { type: SelectableValue<string> & { valid?: boolean } };
