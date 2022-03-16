import React, { useState } from 'react';
import { MyQuery } from '../@types/types';
import { TextArea } from '@grafana/ui';

type Props = {
  query: MyQuery;
  onChange: (query: MyQuery) => void;
  onRunQuery: () => void;
};

export const RawCentreonQueryEditor = ({ onChange, onRunQuery, query }: Props) => {
  const [currentQuery, setCurrentQuery] = useState<string>(query.rawSelector || '');

  const applyDelayedChangesAndRunQuery = () => {
    onChange({
      ...query,
      rawSelector: currentQuery,
    });
    onRunQuery();
  };

  return (
    <TextArea
      aria-label="query"
      rows={3}
      spellCheck={false}
      placeholder="Centreon filters"
      onBlur={applyDelayedChangesAndRunQuery}
      onChange={(e) => {
        setCurrentQuery(e.currentTarget.value);
      }}
      value={currentQuery ?? ''}
    />
  );
};
