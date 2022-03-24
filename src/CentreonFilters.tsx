import { CentreonDataSource } from './centreonDataSource';
import { Alert, AsyncSelect, Button, HorizontalGroup, InlineField, Select } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';
import React, { useEffect, useState } from 'react';
import { ISavedFilter } from './@types/ISavedFilter';

type Props = {
  filters?: Array<ISavedFilter>;
  onChange: (filters: Array<ISavedFilter>) => void;
  datasource: CentreonDataSource;
  types?: Array<SelectableValue<string>>;
  customFilters?: Record<string, Array<SelectableValue<string>>>;
};

const resourcesLoaded: Record<'__types' | string, Array<SelectableValue<string>>> = {};

export const CentreonFilters = ({
  onChange,
  datasource,
  filters: defaultFilters = [],
  types = [],
  customFilters = {},
}: Props) => {
  const [filters, setFilters] = useState<Array<ISavedFilter>>(defaultFilters || []);

  const getResources = async (type: string, resourcesFilters?: Record<string, string>) => {
    try {
      const res = await datasource.getResources(type, resourcesFilters);
      resourcesLoaded[type] = (resourcesLoaded[type] || [])
        //add new resources to previous list
        .concat(res)
        //remove duplicate based on .value
        .filter((value, index, self) => index === self.findIndex((t) => t.value === value.value));
      return res;
    } catch (e) {
      setFilters(() => {
        throw e;
      });
    }
    return [];
  };

  useEffect(() => {
    onChange(filters);
  }, [filters]);

  let errors: Array<string> = [];

  //search filters in double
  const usedFilters: Array<string> = [];

  // TODO useless, only used to add errors in the errors array
  // const doubleFilters =
  filters.forEach((filter) => {
    const value = filter.type.value;
    if (value && usedFilters.includes(value)) {
      errors.push(`Filter types need to be uniq (${filter.type.label})`);
      return true;
    }

    if (filter.type.value) {
      usedFilters.push(filter.type.value);
    }
    return false;
  });
  // .map((f) => f.type.value);

  //how to use valid per select ?
  // const showFilters: Array<tFilter> = filters.map((filter) => ({
  //   ...filter,
  //   valid: !doubleFilters.includes(filter.type.value),
  // }));

  const showFilters = filters;

  //remove duplicate errors
  errors = [...new Set(errors)];

  return (
    <div className="gf-form-group">
      {showFilters.length === 0 ? (
        <Alert title="No filters selected" severity="info" />
      ) : (
        showFilters.map(({ type, filters: currentFilters }, i) => (
          //TODO correct key
          <HorizontalGroup key={i}>
            <InlineField label="type" labelWidth={20} invalid={!type.valid}>
              <Select<string>
                options={types}
                value={types?.find((resource) => resource.value === type.value) || type.value}
                onChange={(value) => {
                  const newFilters = [...filters];
                  newFilters[i] = {
                    filters: [],
                    type: {
                      ...type,
                      value: value.value || '',
                    },
                  };
                  setFilters(newFilters);
                }}
                loadingMessage="loading"
                // invalid={!type.valid}
                isLoading={types?.length <= 0}
                width={50}
              />
            </InlineField>
            <InlineField label="filter" labelWidth={20}>
              <AsyncSelect<string>
                isMulti={true}
                disabled={!!type.value}
                allowCustomValue={true}
                defaultValue={
                  resourcesLoaded[type.value || '']?.find(
                    (resource) => resource.value && !!currentFilters.find((f) => f.value === resource.value)
                  ) ||
                  (currentFilters || []).map((f) => ({
                    value: f.value,
                    label: f.label || f.value,
                  }))
                }
                loadOptions={async (name): Promise<Array<SelectableValue<string>>> => {
                  let ret: Array<SelectableValue<string>> = customFilters[type.value || ''] || [];

                  if (type.value) {
                    try {
                      //build the query :
                      // - get all filters from select
                      // - convert to object
                      const query = {
                        //prepare query object from all types
                        ...Object.fromEntries(
                          (filters || []).map((f) => [f.type.value, f.filters.map((f) => f.value)])
                        ),
                      };

                      ret = ret.concat(
                        await getResources(type.value, {
                          ...query,
                          //add current text to the current query type . If query is empty, filter will remove the empty one
                          [type.value]: [...query[type.value], name + '*'].filter((v) => !!v),
                        })
                      );
                    } catch (e) {
                      console.error(e);
                    }
                  } else {
                    return [];
                  }

                  return ret;
                }}
                onChange={(selectedValue) => {
                  const select = selectedValue as unknown as Array<SelectableValue<string>>;

                  const newFilters = [...filters];
                  newFilters[i] = {
                    filters: select.map(({ value, label }) => ({
                      value,
                      label,
                    })),
                    type,
                  };
                  setFilters(newFilters);
                }}
                loadingMessage="loading"
                width={50}
              />
            </InlineField>
            <Button
              type="button"
              onClick={() => {
                setFilters(filters.filter((value, index) => index != i));
              }}
              icon="times"
              variant="secondary"
            ></Button>
          </HorizontalGroup>
        ))
      )}
      <div className="gf-form">
        {errors.length == 0
          ? ''
          : errors.map((error, index) => (
              <React.Fragment key={index}>
                <br />
                <Alert elevated={false} title={error} />
              </React.Fragment>
            ))}
      </div>
      <div className="gf-form">
        <Button
          type="button"
          onClick={() => {
            setFilters([...filters, { type: { value: '', valid: false }, filters: [] }]);
          }}
        >
          Add Filter
        </Button>
      </div>
    </div>
  );
};
