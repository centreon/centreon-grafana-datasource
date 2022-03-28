import { SelectableValue } from '@grafana/data';

export interface SavedFilter {
  id: number;
  type: SelectableValue<string>;
  filters: Array<SelectableValue<string>>;
}
