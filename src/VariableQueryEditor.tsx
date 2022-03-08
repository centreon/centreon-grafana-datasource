import React, { useState, useEffect } from 'react';
import { CentreonMetricOptions, MyQuery } from './types';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { CentreonDataSource } from './centreonDataSource';
import { Button, Select } from '@grafana/ui';

interface VariableQueryEditorState extends MyQuery {
  resourcesOptions: Array<SelectableValue<string>>;
  filters?: Array<IFilter>;
}

interface IFilter {
  type: string;
  value: string;
  loading?: boolean;
}

export const VariableQueryEditor: React.FC<
  QueryEditorProps<CentreonDataSource, MyQuery, CentreonMetricOptions, VariableQueryEditorState>
> = (props) => {
  // const { onChange, query } = props;
  const { query } = props;
  console.log(props);
  const [state, setState] = useState(query);
  const [filters] = useState(state.filters || []);

  useEffect(() => {
    (async () => {
      try {
        //load resources
        const resourcesOptions = (await props.datasource.getResourceList()).map(
          ({ value, label }) =>
            ({
              label,
              value,
            } as SelectableValue<string>)
        );
        setState({
          ...state,
          resourcesOptions,
        });
      } catch (e) {
        setState(() => {
          throw new Error('unknown error');
        });
      }
    })();
  }, [props.datasource]);

  return (
    <>
      <div className="gf-form">
        <span className="gf-form-label width-10">Resource</span>
        <Select<string>
          allowCustomValue={true}
          onCreateOption={(value) => {
            console.log('create option', value);
          }}
          options={state.resourcesOptions}
          value={state.resourcesOptions?.find((resource) => resource.value === state.resource)}
          onChange={(value) => {
            console.log(value);
          }}
          loadingMessage="loading"
          isLoading={!(state.resourcesOptions?.length > 0)}
          width={40}
        />
      </div>
      <h5>Filters</h5>
      <>
        <div className="gf-form">
          {filters.map((filter) => (
            <>
              <Select<string>
                options={state.resourcesOptions}
                value={state.resourcesOptions?.find((resource) => resource.value === filter.type) || filter.type}
                onChange={(value) => {
                  console.log(value);
                }}
                loadingMessage="loading"
                isLoading={!(state.resourcesOptions?.length > 0)}
                width={50}
              />
              <Select<string>
                options={state.resourcesOptions}
                value={'TODO'}
                onChange={(value) => {
                  console.log(value);
                }}
                loadingMessage="loading"
                isLoading={filter.loading != false}
                width={50}
              />
            </>
          ))}
        </div>
      </>
      <div className="gf-form">
        <Button type="button">Add Filter</Button>
      </div>
    </>
  );
};
