import React, { useEffect, useState } from 'react';
import { MyQuery } from '../@types/types';
import { CentreonDataSource } from '../centreonDataSource';
import { SelectableValue, VariableModel } from '@grafana/data';
import { getTemplateSrv } from '@grafana/runtime';
import {CentreonFilters} from "../components/filters/CentreonFilters";

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

  const customFilters: Record<string, Array<SelectableValue<string>>> = {};

  console.log(getTemplateSrv().getVariables());

  getTemplateSrv()
    .getVariables()
    .forEach((v) => {
      const type = (v as unknown as VariableModel & { query: MyQuery }).query.resourceType?.value || '';
      if (!type) {
        //never pass here if variable correctly set
        return;
      }
      if (!customFilters[type]) {
        customFilters[type] = [];
      }

      customFilters[type].push({ label: `$${v.name}`, value: `$${v.name}` });
    });

  return (
    <CentreonFilters
      filters={query.filters}
      onChange={(filters) => {
        onChange({ ...query, filters });
      }}
      forceBottom={true}
      datasource={datasource}
      types={resources.__types}
      customFilters={customFilters}
    />
  );
};
