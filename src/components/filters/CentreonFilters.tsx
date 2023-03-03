import React, { useEffect, useState, useCallback } from 'react';

import { Alert, Button } from '@grafana/ui';
import { SelectableValue, VariableModel } from '@grafana/data';
import { getTemplateSrv } from '@grafana/runtime';

import { SavedFilter } from '../../@types/SavedFilter';
import { CentreonDataSource } from '../../centreonDataSource';
import { MBIResourceType } from '../../@types/centreonAPI';
import { MyQuery } from '../../@types/types';

import { Filter } from './Filter';

interface Props {
  datasource: CentreonDataSource;
  filters?: Array<SavedFilter>;
  forceBottom?: boolean;
  onChange: (filters: Array<SavedFilter>) => void;
  types?: Array<SelectableValue<MBIResourceType>>;
}

const resourcesLoaded: Record<string, Array<SelectableValue<string>>> = {};

export const CentreonFilters = ({
  onChange,
  datasource,
  filters: defaultFilters = [],
  types = [],
  forceBottom = false
}: Props): JSX.Element => {
  const [filters, setFilters] = useState<Array<SavedFilter>>(
    defaultFilters || []
  );

  const getResource = useCallback(
    (type?: MBIResourceType, value?: string): SelectableValue<string> =>
      resourcesLoaded[type?.slug || '']?.find(
        (resource) => resource.value && value === resource.value
      ) || {
        label: value,
        value
      },
    []
  );

  /**
   * 1 - Build query from each other filters selected
   * 2 - add current query filter
   * 3 - send query to Centreon
   * 4 - cache it (for selection),
   * 5 - return the result
   */
  const getResources = useCallback(
    async (
      type: MBIResourceType,
      queryFilters: Array<string>
    ): Promise<SelectableValue<string>> => {
      try {
        const query = {
          // prepare query object from all types
          ...Object.fromEntries(
            (filters || []).map((filter) => [
              filter.type.value?.slug,
              filter.filters.map((f) => f.value)
            ])
          )
        };

        const res = await datasource.getResources(type, {
          ...query,
          [type.slug]: queryFilters
        });
        resourcesLoaded[type.slug] = (resourcesLoaded[type.slug] || [])
          // add new resources to previous list
          .concat(res)
          // remove duplicate based on .value
          .filter(
            (value, index, self) =>
              index === self.findIndex((t) => t.value === value.value)
          );

        return res;
      } catch (e) {
        setFilters(() => {
          throw e;
        });

        return [];
      }
    },
    [filters, datasource]
  );

  // search filters in double (has a value ? with same slug ?)
  let errors: Array<string> = filters
    .filter(
      (item, index) =>
        item.type.value?.slug &&
        filters.some(
          (value, index1) =>
            value.type.value?.slug === item.type.value?.slug && index !== index1
        )
    )
    .map((value) => `Filter types need to be uniq (${value.type.label})`);

  const showFilters = filters;

  // remove duplicate errors
  errors = [...new Set(errors)];

  useEffect(() => {
    if (errors && errors.length === 0) {
      onChange(filters);
    }
    // want to include errors, but produce a loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, onChange]);

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
        value: `$${v.name}`
      });
    });

  return (
    <div className="gf-form-group">
      {showFilters.length === 0 ? (
        <Alert severity="info" title="No filters selected" />
      ) : (
        showFilters.map(({ type, filters: currentFilters, id }, i) => (
          <Filter
            customFilters={customFilters}
            defaultFilters={currentFilters}
            defaultType={type}
            forceBottom={forceBottom}
            getResource={getResource}
            getResources={getResources}
            key={id}
            types={types}
            onChange={(updatedType, updatedFilters): void => {
              const newFilters = [...filters];
              newFilters[i] = {
                filters: updatedFilters,
                id,
                type: updatedType
              };
              setFilters(newFilters);
            }}
            onDelete={(): void =>
              setFilters(filters.filter((uselessValue, index) => index !== i))
            }
          />
        ))
      )}
      <div className="gf-form">
        {errors.length === 0
          ? ''
          : errors.map((error) => (
              <React.Fragment key={error}>
                <br />
                <Alert elevated={false} title={error} />
              </React.Fragment>
            ))}
      </div>
      <div className="gf-form">
        <Button
          type="button"
          onClick={(): void => {
            setFilters([
              ...filters,
              {
                filters: [],
                id: Date.now(),
                type: {
                  valid: false,
                  value: {
                    display_name: '',
                    list_endpoint: '',
                    slug: ''
                  }
                }
              }
            ]);
          }}
        >
          Add Filter
        </Button>
      </div>
    </div>
  );
};
