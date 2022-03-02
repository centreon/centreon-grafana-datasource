import { DataQuery, DataSourceJsonData } from '@grafana/data';

export interface MyQuery extends DataQuery {
  queryText?: string;
  constant: number;
  frequency: number;
}

export const defaultQuery: Partial<MyQuery> = {
  constant: 6.5,
  frequency: 1.0,
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

export interface ILoginResult {
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
