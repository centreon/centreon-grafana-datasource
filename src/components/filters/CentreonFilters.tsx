import React, { useEffect, useState, useCallback } from 'react';

import { Alert, Button } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';

import { SavedFilter } from '../../@types/SavedFilter';
import { CentreonDataSource } from '../../centreonDataSource';
import { MBIResourceType } from '../../@types/centreonAPI';

import { Filter } from './Filter';

interface Props {
  customFilters?: Record<string, Array<SelectableValue<string>>>;
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
  customFilters = {},
  forceBottom = false,
}: Props): JSX.Element => {
  const [filters, setFilters] = useState<Array<SavedFilter>>(
    defaultFilters || [],
  );

  const getResource = useCallback(
    (type?: MBIResourceType, value?: string): SelectableValue<string> =>
      resourcesLoaded[type?.slug || '']?.find(
        (resource) => resource.value && value === resource.value,
      ) || {
        label: value,
        value,
      },
    [],
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
      queryFilters: Array<string>,
    ): Promise<SelectableValue<string>> => {
      try {
        const query = {
          // prepare query object from all types
          ...Object.fromEntries(
            (filters || []).map((filter) => [
              filter.type.value?.slug,
              filter.filters.map((f) => f.value),
            ]),
          ),
        };

        const res = await datasource.getResources(type, {
          ...query,
          [type.slug]: queryFilters,
        });
        resourcesLoaded[type.slug] = (resourcesLoaded[type.slug] || [])
          // add new resources to previous list
          .concat(res)
          // remove duplicate based on .value
          .filter(
            (value, index, self) =>
              index === self.findIndex((t) => t.value === value.value),
          );

        return res;
      } catch (e) {
        setFilters(() => {
          throw e;
        });

        return [];
      }
    },
    [filters, datasource],
  );

  let errors: Array<string> = [];

  // search filters in double
  const usedFilters: Array<string> = [];
  filters.forEach((filter) => {
    const { value } = filter.type;
    if (value?.slug && usedFilters.includes(value.slug)) {
      errors.push(`Filter types need to be uniq (${filter.type.label})`);

      return true;
    }

    if (filter.type.value) {
      usedFilters.push(filter.type.value.slug);
    }

    return false;
  });

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
                type: updatedType,
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
                    slug: '',
                  },
                },
              },
            ]);
          }}
        >
          Add Filter
        </Button>
      </div>
    </div>
  );
};
