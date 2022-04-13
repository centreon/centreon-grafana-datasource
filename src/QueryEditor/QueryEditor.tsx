import React, { useCallback, useEffect, useState } from 'react';

import { css } from '@emotion/css';
import { QueryEditorProps } from '@grafana/data';
import { debounce, defaults } from 'lodash';

import { CentreonDataSource } from '../centreonDataSource';
import { CentreonMetricOptions, defaultQuery, MyQuery } from '../@types/types';

import { QueryEditorModeSwitcher } from './QueryEditorModeSwitcher';
import { EMode } from './EMode';
import { VisualCentreonEditor } from './VisualCentreonEditor';
import { RawCentreonQueryEditor } from './RawCentreonQueryEditor';

type Props = QueryEditorProps<
  CentreonDataSource,
  MyQuery,
  CentreonMetricOptions
>;

export const QueryEditor: React.FC<Props> = (props: Props) => {
  const { query, onRunQuery, onChange: parentOnchange, datasource } = props;
  const state = defaults(query, defaultQuery);

  const [loading, setLoading] = useState(false);
  const onRunQueryDebounced = useCallback(
    () => debounce(onRunQuery, 300)(),
    [onRunQuery],
  );

  const onChange = useCallback((value: MyQuery) => {
    parentOnchange(value);
  }, []);

  const onModeChange = useCallback(
    async (newMode: EMode) => {
      if (newMode === EMode.RAW) {
        const rawSelector = CentreonDataSource.buildRawQuery(state.filters);
        onChange({
          ...state,
          mode: newMode,
          rawSelector,
        });
      } else {
        setLoading(true);
        const filters = await datasource.buildFiltersQuery(state.rawSelector);

        setLoading(false);
        onChange({
          ...state,
          filters,
          mode: newMode,
        });
      }
    },
    [datasource, onChange, setLoading, state],
  );

  useEffect(() => {
    onRunQueryDebounced();
  }, [query, onRunQueryDebounced]);

  const mode = state.mode ?? EMode.VISUAL;
  const currentEditor =
    mode === EMode.RAW ? (
      <RawCentreonQueryEditor
        query={query}
        onChange={onChange}
        onRunQuery={onRunQuery}
      />
    ) : (
      <VisualCentreonEditor
        datasource={datasource}
        query={query}
        onChange={onChange}
      />
    );

  return (
    <div>
      <div className={css({ marginTop: '10px' })}>
        <QueryEditorModeSwitcher mode={mode} onChange={onModeChange} />
      </div>
      <div className={css({ flexGrow: 1, marginTop: '10px' })}>
        {loading ? 'converting raw to visual' : currentEditor}
      </div>
    </div>
  );
};
