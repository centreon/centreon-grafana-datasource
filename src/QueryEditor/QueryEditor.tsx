import React, { useEffect } from 'react';
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
  const { query, onRunQuery, onChange, datasource } = props;
  const onRunQueryDebounced = debounce(onRunQuery, 300);
  const state = defaults(query, defaultQuery);

  useEffect(() => {
    onRunQueryDebounced();
  }, [query]);

  const mode = state.mode ?? EMode.VISUAL;

  // console.log(mode, state.filters, state.rawSelector);

  return (
    <div>
      <div className={css({ marginTop: '10px' })}>
        <QueryEditorModeSwitcher
          mode={mode}
          onChange={(newMode) => {
            if (newMode === EMode.RAW) {
              const rawSelector = datasource.buildRawQuery(state.filters);
              console.log('convert', state.filters, 'to', rawSelector);
              onChange({
                ...state,
                mode: newMode,
                rawSelector,
              });
            } else {
              const filters = datasource.buildFiltersQuery(state.rawSelector);
              console.log(`mode ${newMode} => convert`, state.rawSelector, 'to', filters);

              onChange({
                ...state,
                mode: newMode,
                filters,
              });
            }
          }}
        />
      </div>
      <div className={css({ flexGrow: 1, marginTop: '10px' })}>
        {mode === EMode.RAW ? (
          <RawCentreonQueryEditor query={query} onChange={onChange} onRunQuery={onRunQuery} />
        ) : (
          <VisualCentreonEditor query={query} onChange={onChange} onRunQuery={onRunQuery} datasource={datasource} />
        )}
      </div>
    </div>
  );
};
