import { SelectableValue } from '@grafana/data';

export interface ISavedFilter {
  type: SelectableValue<string>;
  filter: SelectableValue<string>;
}
