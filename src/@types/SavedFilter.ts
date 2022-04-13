import { SelectableValue } from '@grafana/data';

import { MBIResourceType } from './centreonAPI';

export interface SavedFilter {
  filters: Array<SelectableValue<string>>;
  id: number;
  type: SelectableValue<MBIResourceType>;
}
