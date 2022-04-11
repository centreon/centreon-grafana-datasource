import React, { useCallback, useEffect, useState } from 'react';

import { SelectableValue, VariableModel } from '@grafana/data';
import { getTemplateSrv } from '@grafana/runtime';

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
    // don't know how to resolve it . And other parts of query are not important
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const customFilters: Record<string, Array<SelectableValue<string>>> = {};

  getTemplateSrv()
    .getVariables()
    .forEach((v) => {
      const type =
        (v as unknown as VariableModel & { query: MyQuery }).query.resourceType
          ?.value || '';
      if (!type) {
        // never pass here if variable correctly set
        return;
      }
      if (!customFilters[type.slug]) {
        customFilters[type.slug] = [];
      }

      customFilters[type.slug].push({
        label: `$${v.name}`,
        value: `$${v.name}`,
      });
    });

  return (
    <CentreonFilters
      forceBottom
      customFilters={customFilters}
      datasource={datasource}
      filters={query.filters}
      types={resourcesTypes}
      onChange={changeFilters}
    />
  );
};
