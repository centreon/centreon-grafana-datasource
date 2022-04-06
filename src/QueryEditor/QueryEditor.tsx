import React, { useCallback, useEffect, useState } from 'react';
import { css } from '@emotion/css';
import { QueryEditorProps } from '@grafana/data';
import { CentreonDataSource } from '../centreonDataSource';
import { CentreonMetricOptions, defaultQuery, MyQuery } from '../@types/types';
import { debounce, defaults } from 'lodash';
import { QueryEditorModeSwitcher } from './QueryEditorModeSwitcher';
import { EMode } from './EMode';
import { VisualCentreonEditor } from './VisualCentreonEditor';
import { RawCentreonQueryEditor } from './RawCentreonQueryEditor';

type Props = QueryEditorProps<CentreonDataSource, MyQuery, CentreonMetricOptions>;

export const QueryEditor: React.FC<Props> = (props: Props) => {
  const { query, onRunQuery, onChange: parentOnchange, datasource } = props;
  const state = defaults(query, defaultQuery);

  const [loading, setLoading] = useState(false);
  const onRunQueryDebounced = useCallback(() => debounce(onRunQuery, 300)(), [onRunQuery]);

  const onChange = useCallback((value: MyQuery) => {
    parentOnchange(value);
    // onChange from parent seems to change everytime, and so create an infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    onRunQueryDebounced();
  }, [query, onRunQueryDebounced]);

  const onModeChange = useCallback(
    async (newMode: EMode) => {
      if (newMode === EMode.RAW) {
        const rawSelector = datasource.buildRawQuery(state.filters);
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
          mode: newMode,
          filters,
        });
      }
    },
    [datasource, onChange, setLoading, state]
  );

  const mode = state.mode ?? EMode.VISUAL;
  const currentEditor =
    mode === EMode.RAW ? (
      <RawCentreonQueryEditor query={query} onChange={onChange} onRunQuery={onRunQuery} />
    ) : (
      <VisualCentreonEditor query={query} onChange={onChange} onRunQuery={onRunQuery} datasource={datasource} />
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
