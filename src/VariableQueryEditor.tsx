import React, { useEffect, useState } from 'react';
import { CentreonMetricOptions, MyQuery } from './@types/types';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { CentreonDataSource } from './centreonDataSource';
import { Alert, ErrorBoundary, InlineField, Select } from '@grafana/ui';
import { ISavedFilter } from './@types/ISavedFilter';
import {CentreonFilters} from "./components/filters/CentreonFilters";

interface VariableQueryEditorState extends MyQuery {}

export const VariableQueryEditor: React.FC<
  QueryEditorProps<CentreonDataSource, MyQuery, CentreonMetricOptions, VariableQueryEditorState>
> = (props) => {
  const { query, onChange } = props;
  const [state, setState] = useState(query);
  const [filters, setFilters] = useState<Array<ISavedFilter>>(state.filters || []);

  const [resources, setResources] = useState<Record<'__types' | string, Array<SelectableValue<string>>>>({});

  useEffect(() => {
    (async () => {
      try {
        //load resources types
        const resourcesOptions = (await props.datasource.getResourceList()).map(
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
        setState(() => {
          throw new Error('unknown error');
        });
      }
    })();
  }, [props.datasource]);

  useEffect(() => {
    onChange({
      ...state,
      filters: filters.filter(({ filters, type }) => !!filters?.find((f) => f.value) && !!type.value),
      resourceType: state.resourceType,
    });
  }, [onChange, props.datasource, filters, state]);

  const resourceFieldLength =
    Number(resources.__types?.map((a) => a.value || '').sort((a, b) => b.length - a.length)[0]?.length || 10) + 4;

  return (
    <>
      <InlineField label="Resource" labelWidth={20}>
        <Select<string>
          allowCustomValue={true}
          onCreateOption={(value) => {
            console.log('create option', value);
          }}
          // options={resources.__types}
          value={
            resources.__types?.find((resource) => resource.value === state.resourceType?.value) || state.resourceType
          }
          onChange={(value) => {
            setState({
              ...state,
              resourceType: value,
            });
          }}
          loadingMessage="loading"
          isLoading={resources.__types?.length <= 0}
          width={resourceFieldLength}
        />
      </InlineField>
      <h5>Filters</h5>
      <ErrorBoundary>
        {(err) => (
          <>
            {err.error ? (
              <Alert elevated={false} title={`something is wrong : ${err.error.name} ${err.error.stack}`} />
            ) : (
              <CentreonFilters
                filters={filters}
                datasource={props.datasource}
                onChange={(newFilters) => setFilters(newFilters)}
                types={resources.__types}
              />
            )}
          </>
        )}
      </ErrorBoundary>
    </>
  );
};
