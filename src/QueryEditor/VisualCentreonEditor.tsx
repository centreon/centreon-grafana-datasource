import React, { useCallback, useEffect, useState } from 'react';

import { SelectableValue } from '@grafana/data';

import { MyQuery } from '../@types/types';
import { CentreonDataSource } from '../centreonDataSource';
import { CentreonFilters } from '../components/filters/CentreonFilters';
import { SavedFilter } from '../@types/SavedFilter';
import { MBIResourceType } from '../@types/centreonAPI';

interface Props {
  datasource: CentreonDataSource;
  onChange: (query: MyQuery) => void;
  query: MyQuery;
}

export const VisualCentreonEditor = ({
  onChange,
  datasource,
  query,
}: Props): JSX.Element => {
  const [resourcesTypes, setResourcesTypes] = useState<
    Array<SelectableValue<MBIResourceType>>
  >([]);

  const changeFilters = useCallback(
    (filters: Array<SavedFilter>) => {
      onChange({ ...query, filters });
    },
    [onChange],
  );
  // this is duplicated, but no idea how to do it correctly for the moment
  useEffect(() => {
    (async (): Promise<void> => {
      try {
        const resourcesOptions = await datasource.getResourceList();

        setResourcesTypes(resourcesOptions);
      } catch (e) {
        setResourcesTypes(() => {
          throw new Error('unknown error');
        });
      }
    })();
  }, [datasource]);

  return (
    <CentreonFilters
      forceBottom
      datasource={datasource}
      filters={query.filters}
      types={resourcesTypes}
      onChange={changeFilters}
    />
  );
};
