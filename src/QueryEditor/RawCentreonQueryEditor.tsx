import React, { FormEvent, useState } from 'react';

import { TextArea } from '@grafana/ui';

import { MyQuery } from '../@types/types';

interface Props {
  onChange: (query: MyQuery) => void;
  onRunQuery: () => void;
  query: MyQuery;
}

export const RawCentreonQueryEditor = ({
  onChange,
  onRunQuery,
  query,
}: Props): JSX.Element => {
  const [currentQuery, setCurrentQuery] = useState<string>(
    query.rawSelector || '',
  );

  const applyDelayedChangesAndRunQuery = (): void => {
    onChange({
      ...query,
      rawSelector: currentQuery,
    });
    onRunQuery();
  };

  const onTextAreaChange = (event: FormEvent<HTMLTextAreaElement>): void =>
    setCurrentQuery(event.currentTarget.value);

  return (
    <TextArea
      aria-label="query"
      placeholder="Centreon filters"
      rows={3}
      spellCheck={false}
      value={currentQuery ?? ''}
      onBlur={applyDelayedChangesAndRunQuery}
      onChange={onTextAreaChange}
    />
  );
};
