import React from 'react';

import { RadioButtonGroup } from '@grafana/ui';

import { EMode } from './EMode';

interface Props {
  mode: EMode;
  onChange: (newMode: EMode) => void;
}

export const QueryEditorModeSwitcher = ({
  mode,
  onChange,
}: Props): JSX.Element => {
  return (
    <RadioButtonGroup
      options={[
        {
          label: 'raw',
          value: EMode.RAW,
        },
        {
          label: 'visual',
          value: EMode.VISUAL,
        },
      ]}
      size="sm"
      value={mode}
      onChange={onChange}
    />
  );
};
