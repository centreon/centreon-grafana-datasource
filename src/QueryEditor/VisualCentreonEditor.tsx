import React, { useEffect, useState } from 'react';
import { MyQuery } from '../@types/types';
import { CentreonDataSource } from '../centreonDataSource';
import { CentreonFilters } from '../CentreonFilters';
import { SelectableValue } from '@grafana/data';
import { getTemplateSrv } from '@grafana/runtime';

type Props = {
  query: MyQuery;
  onChange: (query: MyQuery) => void;
  onRunQuery: () => void;
  datasource: CentreonDataSource;
};

export const VisualCentreonEditor = ({ onChange, datasource, query }: Props) => {
  const [resources, setResources] = useState<Record<'__types' | string, Array<SelectableValue<string>>>>({});

  // this is duplicated, but no idea how to do it correctly for the moment
  useEffect(() => {
    (async () => {
      try {
        //load resources types
        const resourcesOptions = (await datasource.getResourceList()).map(
          ({ value, label }) =>
            ({
              label,
              value,
            } as SelectableValue<string>)
        );
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
  return (
    <CentreonFilters
      filters={query.filters}
      onChange={(filters) => {
        onChange({ ...query, filters });
      }}
      datasource={datasource}
      types={resources.__types}
      customFilters={getTemplateSrv()
        .getVariables()
        .map((v) => ({ label: `$${v.name}`, value: `$${v.name}` }))}
    />
  );
};
