import { Alert, Button } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';
import React, { useEffect, useState, useCallback } from 'react';
import { SavedFilter } from '../../@types/SavedFilter';
import { CentreonDataSource } from '../../centreonDataSource';
import { Filter } from './Filter';
import { MBIResourceType } from '../../@types/centreonAPI';

type Props = {
  filters?: SavedFilter[];
  onChange: (filters: SavedFilter[]) => void;
  datasource: CentreonDataSource;
  types?: Array<SelectableValue<MBIResourceType>>;
  customFilters?: Record<string, Array<SelectableValue<string>>>;
  forceBottom?: boolean;
};

const resourcesLoaded: Record<string, Array<SelectableValue<string>>> = {};

export const CentreonFilters = ({
  onChange,
  datasource,
  filters: defaultFilters = [],
  types = [],
  customFilters = {},
  forceBottom = false,
}: Props) => {
  const [filters, setFilters] = useState<SavedFilter[]>(defaultFilters || []);

  const getResource = useCallback(
    (type: MBIResourceType, value: string): SelectableValue<string> =>
      resourcesLoaded[type.slug || '']?.find((resource) => resource.value && value === resource.value) || {
        value: value,
        label: value,
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
    async (type: MBIResourceType, queryFilters: string[]): Promise<SelectableValue<string>> => {
      try {
        const query = {
          //prepare query object from all types
          ...Object.fromEntries(
            (filters || []).map((filter) => [filter.type.value, filter.filters.map((f) => f.value)])
          ),
        };

        const res = await datasource.getResources(type, {
          ...query,
          [type.slug]: queryFilters,
        });
        resourcesLoaded[type.slug] = (resourcesLoaded[type.slug] || [])
          //add new resources to previous list
          .concat(res)
          //remove duplicate based on .value
          .filter((value, index, self) => index === self.findIndex((t) => t.value === value.value));
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

  let errors: string[] = [];

  //search filters in double
  const usedFilters: string[] = [];
  filters.forEach((filter) => {
    const value = filter.type.value;
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

  //remove duplicate errors
  errors = [...new Set(errors)];

  useEffect(() => {
    if (errors && errors.length === 0) {
      onChange(filters);
    }
    //want to include errors, but produce a loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, onChange]);

  return (
    <div className="gf-form-group">
      {showFilters.length === 0 ? (
        <Alert title="No filters selected" severity="info" />
      ) : (
        showFilters.map(({ type, filters: currentFilters, id }, i) => (
          <Filter
            key={id}
            defaultFilters={currentFilters}
            defaultType={type}
            customFilters={customFilters}
            forceBottom={forceBottom}
            getResources={getResources}
            getResource={getResource}
            types={types}
            onDelete={() => setFilters(filters.filter((value, index) => index !== i))}
            onChange={(updatedType, updatedFilters) => {
              const newFilters = [...filters];
              newFilters[i] = {
                id,
                filters: updatedFilters,
                type: updatedType,
              };
              setFilters(newFilters);
            }}
          />
        ))
      )}
      <div className="gf-form">
        {errors.length === 0
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
            setFilters([
              ...filters,
              {
                type: {
                  value: {
                    slug: '',
                    list_endpoint: '',
                    display_name: '',
                  },
                  valid: false,
                },
                filters: [],
                id: Date.now(),
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
