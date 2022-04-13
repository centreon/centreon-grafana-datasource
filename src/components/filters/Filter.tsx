import React, { useEffect, useState, useRef } from 'react';

import {
  AsyncSelect,
  Button,
  HorizontalGroup,
  InlineField,
  Select,
} from '@grafana/ui';
import { SelectableValue } from '@grafana/data';

import { MBIResourceType } from '../../@types/centreonAPI';
import { TypeFilter } from '../../@types/types';

interface Props {
  customFilters?: Record<string, Array<SelectableValue<string>>>;
  defaultFilters: Array<SelectableValue<string>>;
  defaultType: TypeFilter;
  forceBottom: boolean;
  getResource: (
    type?: MBIResourceType,
    value?: string,
  ) => SelectableValue<string>;
  getResources: (
    type: MBIResourceType,
    query: Array<string>,
  ) => Promise<SelectableValue<string>>;
  onChange?: (
    type: TypeFilter,
    filters: Array<SelectableValue<string>>,
  ) => void;
  onDelete?: () => void;
  types: Array<TypeFilter>;
}

export const Filter = ({
  forceBottom,
  types,
  customFilters = {},
  getResource,
  getResources,
  onDelete,
  onChange,
  defaultFilters,
  defaultType,
}: Props): JSX.Element => {
  const [type, setType] = useState<TypeFilter>(defaultType);
  const [filters, setFilters] =
    useState<Array<SelectableValue<string>>>(defaultFilters);
  const val = useRef<{ filters: Array<string>; type: MBIResourceType | null }>({
    filters: [],
    type: null,
  });

  useEffect(() => {
    if (
      JSON.stringify(val.current.filters) !==
        JSON.stringify(filters.map((f) => f.value)) ||
      val.current.type !== type.value
    ) {
      onChange?.(type, filters);
      val.current = {
        filters: filters.map((f) => f.value || ''),
        type: type.value || null,
      };
    }
  }, [type, filters, onChange]);

  const menuPlacement = forceBottom ? 'bottom' : 'auto';

  const loadedFilter = types?.find(
    (resource) => resource.value?.slug === type.value?.slug,
  );
  const typesLoading = !types || types.length === 0;

  return (
    <HorizontalGroup>
      <InlineField label="type" labelWidth={20}>
        <Select<MBIResourceType>
          allowCreateWhileLoading
          isLoading={typesLoading}
          loadingMessage="loading"
          menuPlacement={forceBottom ? 'bottom' : 'auto'}
          options={types}
          value={
            loadedFilter || {
              label: type.value?.display_name,
              value: type.value,
            }
          }
          width={50}
          onChange={setType}
        />
      </InlineField>
      <InlineField label="filter" labelWidth={20}>
        {loadedFilter ? (
          <AsyncSelect<string>
            allowCustomValue
            defaultOptions
            isMulti
            cacheOptions={false}
            defaultValue={filters.map((f) => getResource(type.value, f.value))}
            disabled={!type.value}
            loadOptions={async (
              name,
            ): Promise<Array<SelectableValue<string>>> => {
              let ret: Array<SelectableValue<string>> =
                customFilters[type.value?.slug || ''] || [];

              if (type.value) {
                // build the query :
                // - get all filters from select
                // - convert to object

                ret = ret.concat(
                  await getResources(
                    type.value,
                    [
                      ...filters.map((f) => f.value || ''),
                      name ? `${name}*` : '',
                    ].filter((v) => !!v),
                  ),
                );
              } else {
                return [];
              }

              return ret;
            }}
            loadingMessage="loading"
            menuPlacement={menuPlacement}
            width={50}
            onChange={(selectedValue): void => {
              setFilters(
                selectedValue as unknown as Array<SelectableValue<string>>,
              );
            }}
          />
        ) : (
          <Select<string>
            allowCreateWhileLoading={false}
            isLoading={typesLoading}
            loadingMessage="loading"
            menuPlacement={menuPlacement}
            noOptionsMessage="you need to select a type before"
            options={[]}
            width={50}
            onChange={(): undefined => undefined}
          />
        )}
      </InlineField>
      <Button
        icon="times"
        type="button"
        variant="secondary"
        onClick={onDelete}
      />
    </HorizontalGroup>
  );
};
