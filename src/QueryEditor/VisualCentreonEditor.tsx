import React, { useCallback, useEffect, useState } from 'react';
import { MyQuery } from '../@types/types';
import { CentreonDataSource } from '../centreonDataSource';
import { SelectableValue, VariableModel } from '@grafana/data';
import { getTemplateSrv } from '@grafana/runtime';
import { CentreonFilters } from '../components/filters/CentreonFilters';
import { SavedFilter } from '../@types/SavedFilter';
import { MBIResourceType } from '../@types/centreonAPI';

type Props = {
  query: MyQuery;
  onChange: (query: MyQuery) => void;
  onRunQuery: () => void;
  datasource: CentreonDataSource;
};

export const VisualCentreonEditor = ({ onChange, datasource, query }: Props) => {
  const [resources, setResources] = useState<Record<'__types' | string, Array<SelectableValue<MBIResourceType>>>>({});

  // this is duplicated, but no idea how to do it correctly for the moment
  useEffect(() => {
    (async () => {
      try {
        const resourcesOptions = await datasource.getResourceList();

        setResources({
          __types: resourcesOptions,
        });
      } catch (e) {
        setResources(() => {
          throw new Error('unknown error');
        });
      }
    })();
  }, [datasource]);

  const customFilters: Record<string, Array<SelectableValue<string>>> = {};

  getTemplateSrv()
    .getVariables()
    .forEach((v) => {
      const type = (v as unknown as VariableModel & { query: MyQuery }).query.resourceType?.value || '';
      if (!type) {
        //never pass here if variable correctly set
        return;
      }
      if (!customFilters[type.slug]) {
        customFilters[type.slug] = [];
      }

      customFilters[type.slug].push({ label: `$${v.name}`, value: `$${v.name}` });
    });

  const changeFilters = useCallback(
    (filters: SavedFilter[]) => {
      onChange({ ...query, filters });
    },
    // don't know how to resolve it . And other parts of query are not important
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onChange]
  );

  return (
    <CentreonFilters
      filters={query.filters}
      onChange={changeFilters}
      forceBottom={true}
      datasource={datasource}
      types={resources.__types}
      customFilters={customFilters}
    />
  );
};
