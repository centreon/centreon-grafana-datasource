import React from 'react';
import { RadioButtonGroup } from '@grafana/ui';
import { EMode } from './EMode';

type Props = {
  mode: EMode;
  onChange: (newMode: EMode) => void;
};

export const QueryEditorModeSwitcher = ({ mode, onChange }: Props): JSX.Element => {
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

  // if (mode === EMode.RAW) {
  //   return (
  //     <>
  {
    /*      <Button*/
  }
  //         aria-label="Switch to visual editor"
  //         title="Switch to visual editor"
  //         icon="pen"
  //         variant="secondary"
  //         type="button"
  //         onClick={() => {
  //           onChange(EMode.VISUAL);
  //         }}
  //       ></Button>
  //     </>
  //   );
  // } else {
  //   return (
  //     <Button
  //       aria-label="Switch to text editor"
  //       title="Switch to text editor"
  //       icon="pen"
  //       variant="secondary"
  //       type="button"
  //       onClick={() => {
  //         onChange(EMode.RAW);
  //       }}
  //     ></Button>
  //   );
  // }
};
