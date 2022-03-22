import React from 'react';
import { Button } from '@grafana/ui';
import { EMode } from './EMode';

type Props = {
  mode: EMode;
  onChange: (newMode: EMode) => void;
};

export const QueryEditorModeSwitcher = ({ mode, onChange }: Props): JSX.Element => {
  if (mode === EMode.RAW) {
    return (
      <>
        <Button
          aria-label="Switch to visual editor"
          title="Switch to visual editor"
          icon="pen"
          variant="secondary"
          type="button"
          onClick={() => {
            onChange(EMode.VISUAL);
          }}
        ></Button>
      </>
    );
  } else {
    return (
      <Button
        aria-label="Switch to text editor"
        title="Switch to text editor"
        icon="pen"
        variant="secondary"
        type="button"
        onClick={() => {
          onChange(EMode.RAW);
        }}
      ></Button>
    );
  }
};
