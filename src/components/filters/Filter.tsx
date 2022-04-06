import React, { useEffect, useState, useRef } from 'react';
import { AsyncSelect, Button, HorizontalGroup, InlineField, Select } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';
import { MBIResourceType } from '../../@types/centreonAPI';
import { TypeFilter } from '../../@types/types';

interface Props {
  types: TypeFilter[];
  forceBottom: boolean;
  customFilters?: Record<string, Array<SelectableValue<string>>>;
  getResource: (type: MBIResourceType, value: string) => SelectableValue<string>;
  getResources: (type: MBIResourceType, query: string[]) => Promise<SelectableValue<string>>;
  onDelete?: () => void;
  onChange?: (type: TypeFilter, filters: Array<SelectableValue<string>>) => void;
  defaultType: TypeFilter;
  defaultFilters: Array<SelectableValue<string>>;
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
}: Props) => {
  const [type, setType] = useState<TypeFilter>(defaultType);
  const [filters, setFilters] = useState<Array<SelectableValue<string>>>(defaultFilters);
  const val = useRef<{ filters: string[]; type: MBIResourceType | null }>({
    filters: [],
    type: null,
  });

  useEffect(() => {
    if (
      JSON.stringify(val.current.filters) !== JSON.stringify(filters.map((f) => f.value)) ||
      val.current.type !== type.value
    ) {
      onChange?.(type, filters);
      val.current = {
        type: type.value || null,
        filters: filters.map((f) => f.value || ''),
      };
    }
  }, [type, filters, onChange]);

  const menuPlacement = forceBottom ? 'bottom' : 'auto';

  const loadedFilter = types?.find((resource) => resource.value?.slug === type.value?.slug);
  const typesLoading = !types || types.length === 0;

  return (
    <HorizontalGroup>
      <InlineField label="type" labelWidth={20}>
        <Select<MBIResourceType>
          menuPlacement={forceBottom ? 'bottom' : 'auto'}
          allowCreateWhileLoading={true}
          options={types}
          value={
            loadedFilter || {
              label: type.value?.display_name,
              value: type.value,
            }
          }
          onChange={setType}
          loadingMessage="loading"
          isLoading={typesLoading}
          width={50}
        />
      </InlineField>
      <InlineField label="filter" labelWidth={20}>
        {!!loadedFilter ? (
          <AsyncSelect<string>
            menuPlacement={menuPlacement}
            cacheOptions={false}
            isMulti={true}
            disabled={!type.value}
            defaultOptions={true}
            allowCustomValue={true}
            defaultValue={filters.map((f) => getResource(type.value!, f.value!))}
            loadOptions={async (name): Promise<Array<SelectableValue<string>>> => {
              let ret: Array<SelectableValue<string>> = customFilters[type.value?.slug || ''] || [];

              if (type.value) {
                try {
                  //build the query :
                  // - get all filters from select
                  // - convert to object

                  ret = ret.concat(
                    await getResources(
                      type.value,
                      [...filters.map((f) => f.value!), name ? name + '*' : ''].filter((v) => !!v)
                    )
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
              setFilters(selectedValue as unknown as Array<SelectableValue<string>>);
            }}
            loadingMessage="loading"
            width={50}
          />
        ) : (
          <Select<string>
            menuPlacement={menuPlacement}
            allowCreateWhileLoading={false}
            isLoading={typesLoading}
            loadingMessage="loading"
            options={[]}
            onChange={() => {}}
            noOptionsMessage={'you need to select a type before'}
            width={50}
          />
        )}
      </InlineField>
      <Button type="button" onClick={onDelete} icon="times" variant="secondary" />
    </HorizontalGroup>
  );
};
