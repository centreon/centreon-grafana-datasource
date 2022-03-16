import React, { useEffect, useState } from 'react';
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
  const [state, setState] = useState(defaults(query, defaultQuery));
  const [mode, setMode] = useState(EMode.VISUAL);

  useEffect(() => {
    onRunQueryDebounced();
    onChange(state);
  }, [state]);

  return (
    <div className={css({ display: 'flex' })}>
      <div className={css({ flexGrow: 1 })}>
        {mode ? (
          <RawCentreonQueryEditor query={query} onChange={setState} onRunQuery={onRunQuery} />
        ) : (
          <VisualCentreonEditor query={query} onChange={setState} onRunQuery={onRunQuery} datasource={datasource} />
        )}
      </div>
      <QueryEditorModeSwitcher
        mode={mode}
        onChange={(newMode) => {
          setMode(newMode);
        }}
      />
    </div>
  );
};
