import { SelectableValue } from '@grafana/data';

export interface ISavedFilter {
  type: SelectableValue<string>;
  filters: Array<SelectableValue<string>>;
}
