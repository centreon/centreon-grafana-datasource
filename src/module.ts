import { DataSourcePlugin } from '@grafana/data';
import { CentreonDataSource } from './centreonDataSource';
import { ConfigEditor } from './ConfigEditor';
import { QueryEditor } from './QueryEditor';
import { MyQuery, CentreonMetricOptions } from './types';
import { VariableQueryEditor } from './VariableQueryEditor';

export const plugin = new DataSourcePlugin<CentreonDataSource, MyQuery, CentreonMetricOptions>(CentreonDataSource)
  .setConfigEditor(ConfigEditor)
  .setQueryEditor(QueryEditor)
  .setVariableQueryEditor(VariableQueryEditor);
