import { DataQuery, DataSourceJsonData, SelectableValue } from '@grafana/data';
import { SavedFilter } from './SavedFilter';
import { EMode } from '../QueryEditor/EMode';
import { MBIResourceType } from './centreonAPI';

export interface MyQuery extends DataQuery {
  resourceType?: SelectableValue<MBIResourceType>;

  mode?: EMode;

  rawSelector?: string;
  filters?: SavedFilter[];
}

export const defaultQuery: Partial<MyQuery> = {
  rawSelector: 'host:berlin metric:load',
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

export type tFilter = SavedFilter & { type: SelectableValue<string> & { valid?: boolean } };

export type TypeFilter = SelectableValue<MBIResourceType>;

export type strOrArrStr = undefined | string | Array<undefined | string>;
