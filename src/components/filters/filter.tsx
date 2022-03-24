import React, { useEffect, useState } from 'react';
import { AsyncSelect, Button, HorizontalGroup, InlineField, Select } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';

// TODO In progress, not used

interface Props {
  types: Array<SelectableValue<string>>;
  forceBottom: boolean;
  customFilters?: Record<string, Array<SelectableValue<string>>>;
  getResource: (type: string, value: string) => SelectableValue<string>;
  getResources: (type: string, query: Array<string>) => SelectableValue<string>;
  onDelete?: () => void;
  onChange?: (type: SelectableValue<string>, filters: Array<SelectableValue<string>>) => void;
}

export const Filter = ({
  forceBottom,
  types,
  customFilters = {},
  getResource,
  getResources,
  onDelete,
  onChange,
}: Props) => {
  const [type, setType] = useState<SelectableValue<string>>({});
  const [filters, setFilters] = useState<Array<SelectableValue<string>>>([]);

  useEffect(() => {
    onChange?.(type, filters);
  }, [type, filters, onChange]);

  return (
    <HorizontalGroup>
      <InlineField label="type" labelWidth={20}>
        <Select<string>
          menuPlacement={forceBottom ? 'bottom' : 'auto'}
          allowCreateWhileLoading={true}
          options={types}
          value={types?.find((resource) => resource.value === type.value) || type.value}
          onChange={setType}
          loadingMessage="loading"
          // invalid={!type.valid}
          isLoading={types?.length <= 0}
          width={50}
        />
      </InlineField>
      <InlineField label="filter" labelWidth={20}>
        {type.value ? (
          <AsyncSelect<string>
            menuPlacement={forceBottom ? 'bottom' : 'auto'}
            cacheOptions={false}
            isMulti={true}
            disabled={!type.value}
            allowCustomValue={true}
            defaultValue={filters.map((f) => getResource(type.value!, f.value!))}
            loadOptions={async (name): Promise<Array<SelectableValue<string>>> => {
              let ret: Array<SelectableValue<string>> = customFilters[type.value || ''] || [];

              if (type.value) {
                try {
                  //build the query :
                  // - get all filters from select
                  // - convert to object

                  ret = ret.concat(
                    await getResources(
                      type.value,
                      [...filters.map((f) => f.value!), name + '*'].filter((v) => !!v)
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
            menuPlacement={forceBottom ? 'bottom' : 'auto'}
            allowCreateWhileLoading={false}
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
