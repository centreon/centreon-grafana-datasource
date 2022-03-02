import { DataSourcePlugin } from '@grafana/data';
import { DataSource } from './datasource';
import { ConfigEditor } from './ConfigEditor';
import { QueryEditor } from './QueryEditor';
import { MyQuery, CentreonMetricOptions } from './types';

export const plugin = new DataSourcePlugin<DataSource, MyQuery, CentreonMetricOptions>(DataSource)
  .setConfigEditor(ConfigEditor)
  .setQueryEditor(QueryEditor);
