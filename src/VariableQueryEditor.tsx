import React, { useEffect, useState } from 'react';
import { CentreonMetricOptions, MyQuery } from './@types/types';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { CentreonDataSource } from './centreonDataSource';
import { Alert, AsyncSelect, Button, HorizontalGroup, InlineField, Select } from '@grafana/ui';

interface ISavedFilter {
  type: SelectableValue<string>;
  filter: SelectableValue<string>;
}

interface VariableQueryEditorState extends MyQuery {
  filters?: Array<ISavedFilter>;
}

type filter = ISavedFilter & { type: SelectableValue<string> & { valid?: boolean } };
// interface IFilter {
//   type: {
//     value: string;
//     valid: boolean;
//   };
//   filter: {
//     value?: string;
//     label?: string;
//     valid?: boolean;
//     loading?: boolean;
//   };
// }

const resourcesLoaded: Record<'__types' | string, Array<SelectableValue<string>>> = {};

export const VariableQueryEditor: React.FC<
  QueryEditorProps<CentreonDataSource, MyQuery, CentreonMetricOptions, VariableQueryEditorState>
> = (props) => {
  const { query, onChange } = props;
  console.log(onChange);
  const [state, setState] = useState(query);
  const [filters, setFilters] = useState<Array<ISavedFilter>>(state.filters || []);
  const [resources, setResources] = useState<Record<'__types' | string, Array<SelectableValue<string>>>>({});

  const getResources = async (type: string, resourceQuery?: string) => {
    try {
      const res = await props.datasource.getResources(type, resourceQuery);
      resourcesLoaded[type] = (resourcesLoaded[type] || [])
        //add new resources to previous list
        .concat(res)
        //remove duplicate based on .value
        .filter((value, index, self) => index === self.findIndex((t) => t.value === value.value));
      return res;
    } catch (e) {
      setState(() => {
        throw e;
      });
    }
    return [];
  };

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

  // useEffect(() => {
  //   (async () => {
  //     try {
  //       //load resources
  //       const resourcesOptions = (await props.datasource.getResourceList()).map(
  //         ({ value, label }) =>
  //           ({
  //             label,
  //             value,
  //           } as SelectableValue<string>)
  //       );
  //       setState({
  //         ...state,
  //         resourcesOptions,
  //       });
  //     } catch (e) {
  //       setState(() => {
  //         throw new Error('unknown error');
  //       });
  //     }
  //   })();
  // }, [props.datasource, filters]);

  // useEffect(() => {
  //   onChange({
  //     filters,
  //     resource: state.resource,
  //   });
  // }, [onChange, props.datasource, filters, state]);

  console.log(resources);

  let errors: Array<string> = [];

  //search filters in double
  const usedFilters: Array<string> = [];
  console.log('check filters', filters);
  const doubleFilters = filters
    .filter((filter) => {
      const value = filter.type.value;
      console.log('check value', value);
      if (value && usedFilters.includes(value)) {
        errors.push('Filter types need to be uniq');
        return true;
      }

      if (filter.type.value) {
        usedFilters.push(filter.type.value);
      }
      return false;
    })
    .map((filter) => filter.type.value);

  const showFilters: Array<filter> = filters.map((filter) => ({
    ...filter,
    valid: filter.filter.valid && !doubleFilters.includes(filter.type.value),
  }));
  console.log('errors', errors);
  //remove duplicate errors
  errors = [...new Set(errors)];

  return (
    <>
      <InlineField label="Resource">
        <Select<string>
          allowCustomValue={true}
          onCreateOption={(value) => {
            console.log('create option', value);
          }}
          options={resources.__types}
          value={resources.__types?.find((resource) => resource.value === state.resource)}
          onChange={(value) => {
            console.log(value);
          }}
          loadingMessage="loading"
          isLoading={resources.__types?.length <= 0}
          width={40}
        />
      </InlineField>
      <h5>Filters</h5>
      <div className="gf-form-group">
        {showFilters.map(({ filter, type }, i) => (
          <HorizontalGroup key={i}>
            <InlineField label="type">
              <Select<string>
                options={resources.__types}
                value={resources.__types?.find((resource) => resource.value === type.value) || type.value}
                onChange={(value) => {
                  const newFilters = [...filters];
                  newFilters[i] = {
                    filter: {
                      value: '',
                      valid: true,
                    },
                    type: {
                      ...type,
                      value: value.value || '',
                    },
                  };
                  setFilters(newFilters);
                }}
                loadingMessage="loading"
                invalid={!type.valid}
                isLoading={resources.__types?.length <= 0}
                width={50}
              />
            </InlineField>
            <InlineField label="filter">
              <AsyncSelect<string>
                allowCustomValue={true}
                defaultValue={[
                  resourcesLoaded[type.value || '']?.find((resource) => resource.value === filter.value) || {
                    value: filter.value,
                    label: filter.label || filter.value,
                  },
                ]}
                loadOptions={async (filterQuery): Promise<Array<SelectableValue<string>>> => {
                  if (type.value) {
                    console.log('do request for new query');
                    return getResources(type.value, filterQuery);
                  } else {
                    console.log('no type, skip query');
                    return [];
                  }
                }}
                invalid={!!filter.value}
                onChange={(select) => {
                  const newFilters = [...filters];
                  newFilters[i] = {
                    filter: {
                      value: select.value,
                      label: select.label,
                    },
                    type,
                  };
                  debugger;
                  setFilters(newFilters);
                }}
                loadingMessage="loading"
                width={50}
              />
            </InlineField>
          </HorizontalGroup>
        ))}
      </div>
      <div className="gf-form">
        {errors.length == 0 ? '' : errors.map((error) => <Alert elevated={false} title={error} />)}
      </div>
      <div className="gf-form">
        <Button
          type="button"
          onClick={() => {
            setFilters([...filters, { type: { value: '', valid: false }, filter: { value: '', valid: false } }]);
          }}
        >
          Add Filter
        </Button>
      </div>
    </>
  );
};
