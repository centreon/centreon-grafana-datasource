import { SelectableValue } from '@grafana/data';

export interface ISavedFilter {
  id: number;
  type: SelectableValue<string>;
  filters: Array<SelectableValue<string>>;
}
