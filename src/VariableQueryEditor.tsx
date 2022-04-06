import React, { useEffect, useState } from 'react';
import { CentreonMetricOptions, MyQuery } from './@types/types';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { CentreonDataSource } from './centreonDataSource';
import { Alert, ErrorBoundary, InlineField, Select } from '@grafana/ui';
import { SavedFilter } from './@types/SavedFilter';
import { CentreonFilters } from './components/filters/CentreonFilters';
import { MBIResourceType } from './@types/centreonAPI';

interface VariableQueryEditorState extends MyQuery {}

export const VariableQueryEditor: React.FC<
  QueryEditorProps<CentreonDataSource, MyQuery, CentreonMetricOptions, VariableQueryEditorState>
> = (props) => {
  const { query, onChange } = props;
  const [state, setState] = useState(query);
  const [filters, setFilters] = useState<SavedFilter[]>(state.filters || []);

  const [resources, setResources] = useState<Record<'__types' | string, Array<SelectableValue<MBIResourceType>>>>({});

  useEffect(() => {
    (async () => {
      try {
        const resourcesOptions = await props.datasource.getResourceList();
        setResources({
          __types: resourcesOptions,
        });
      } catch (e) {
        console.error(e);
        setState(() => {
          throw new Error('unknown error');
        });
      }
    })();
  }, [props.datasource]);

  useEffect(() => {
    onChange({
      ...state,
      filters: filters.filter(
        ({ filters: currentFilters, type }) => !!currentFilters?.find((f) => f.value) && !!type.value
      ),
      resourceType: state.resourceType,
    });
  }, [onChange, props.datasource, filters, state]);

  const resourceFieldLength =
    Number(
      resources.__types
        ?.map(
          (a) =>
            a.value || {
              slug: '',
              display_name: '',
              list_endpoint: '',
            }
        )
        .sort((a, b) => b.slug.length - a.slug.length)[0]?.slug.length || 10
    ) + 4;

  return (
    <>
      <InlineField label="Resource" labelWidth={20}>
        <Select<MBIResourceType>
          allowCustomValue={true}
          onCreateOption={(value) => {
            console.log('create option', value);
          }}
          options={resources.__types}
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
          isLoading={!resources.__types || resources.__types?.length <= 0}
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
