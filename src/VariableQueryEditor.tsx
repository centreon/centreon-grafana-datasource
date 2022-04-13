import React, { useEffect, useState } from 'react';

import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { Alert, ErrorBoundary, InlineField, Select } from '@grafana/ui';

import { CentreonMetricOptions, MyQuery } from './@types/types';
import { CentreonDataSource } from './centreonDataSource';
import { SavedFilter } from './@types/SavedFilter';
import { CentreonFilters } from './components/filters/CentreonFilters';
import { MBIResourceType } from './@types/centreonAPI';

type VariableQueryEditorState = MyQuery;

export const VariableQueryEditor: React.FC<
  QueryEditorProps<
    CentreonDataSource,
    MyQuery,
    CentreonMetricOptions,
    VariableQueryEditorState
  >
> = ({ datasource, onChange, query }) => {
  const [state, setState] = useState(query);
  const [filters, setFilters] = useState<Array<SavedFilter>>(
    state.filters || [],
  );

  const [resources, setResources] = useState<
    Array<SelectableValue<MBIResourceType>>
  >([]);

  useEffect(() => {
    (async (): Promise<void> => {
      try {
        const resourcesOptions = await datasource.getResourceList();
        setResources(resourcesOptions);
      } catch (e) {
        console.error(e);
        setState(() => {
          throw new Error('unknown error');
        });
      }
    })();
  }, [datasource]);

  useEffect(() => {
    onChange({
      ...state,
      filters: filters.filter(
        ({ filters: currentFilters, type }) =>
          !!currentFilters?.find((f) => f.value) && !!type.value,
      ),
      resourceType: state.resourceType,
    });
  }, [onChange, datasource, filters, state]);

  const resourceFieldLength =
    Number(
      resources
        ?.map(
          (a) =>
            a.value || {
              display_name: '',
              list_endpoint: '',
              slug: '',
            },
        )
        .sort((a, b) => b.slug.length - a.slug.length)[0]?.slug.length || 10,
    ) + 4;

  return (
    <>
      <InlineField label="Resource" labelWidth={20}>
        <Select<MBIResourceType>
          allowCustomValue
          isLoading={!resources || resources?.length <= 0}
          loadingMessage="loading"
          options={resources}
          value={
            resources?.find(
              (resource) => resource.value === state.resourceType?.value,
            ) || state.resourceType
          }
          width={resourceFieldLength}
          onChange={(value): void => {
            setState({
              ...state,
              resourceType: value,
            });
          }}
        />
      </InlineField>
      <h5>Filters</h5>
      <ErrorBoundary>
        {(err): JSX.Element =>
          err.error ? (
            <Alert
              elevated={false}
              title={`something is wrong : ${err.error.name} ${err.error.stack}`}
            />
          ) : (
            <CentreonFilters
              datasource={datasource}
              filters={filters}
              types={resources}
              onChange={(newFilters): void => setFilters(newFilters)}
            />
          )
        }
      </ErrorBoundary>
    </>
  );
};
