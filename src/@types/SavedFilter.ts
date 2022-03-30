import { SelectableValue } from '@grafana/data';
import { MBIResourceType } from './centreonAPI';

export interface SavedFilter {
  id: number;
  type: SelectableValue<MBIResourceType>;
  filters: Array<SelectableValue<string>>;
}
