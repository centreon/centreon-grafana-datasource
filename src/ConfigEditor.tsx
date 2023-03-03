import React, { ChangeEvent } from 'react';

import { InlineField, Input, Select } from '@grafana/ui';
import {
  DataSourcePluginOptionsEditorProps,
  SelectableValue
} from '@grafana/data';

import {
  CentreonMetricOptions,
  CentreonMetricSecureDatas,
  EAccess
} from './@types/types';

type Props = DataSourcePluginOptionsEditorProps<
  CentreonMetricOptions,
  CentreonMetricSecureDatas
>;

export const ConfigEditor = (props: Props): JSX.Element => {
  const { onOptionsChange, options } = props;
  const onChangeCentreonURL = (event: ChangeEvent<HTMLInputElement>): void => {
    const centreonURL = event.target.value;

    const newJSONData = {
      ...options.jsonData,
      centreonURL
    };
    onOptionsChange({
      ...options,
      jsonData: newJSONData
    });
  };

  const onChangeUsername = (event: ChangeEvent<HTMLInputElement>): void => {
    const newJSONData = {
      ...options.jsonData,
      username: event.target.value
    };
    onOptionsChange({
      ...options,
      jsonData: newJSONData
    });
  };

  // Secure field (only sent to the backend)
  const onChangePassword = (event: ChangeEvent<HTMLInputElement>): void => {
    const { value } = event.target;

    const newSecureJsonData = options.secureJsonData || {};
    const newSecureJsonFields = options.secureJsonFields;
    const newJSONData = options.jsonData;
    if (options.jsonData.access === EAccess.PROXY) {
      newSecureJsonData.password = value;
      newJSONData.password = '';
    } else {
      newJSONData.password = value;
      newSecureJsonFields.password = false;
      newSecureJsonData.password = '';
    }

    onOptionsChange({
      ...options,
      jsonData: newJSONData,
      secureJsonData: newSecureJsonData,
      secureJsonFields: newSecureJsonFields
    });
  };

  const onChangeAccessMode = (selected: SelectableValue<EAccess>): void => {
    if (!selected?.value) {
      return;
    }

    const newJSONData = {
      ...options.jsonData,
      access: selected.value,
      password: ''
    };
    onOptionsChange({
      ...options,
      jsonData: newJSONData,
      secureJsonData: {
        password: ''
      },
      secureJsonFields: {
        password: false
      }
    });
  };

  const { jsonData, secureJsonFields } = options;
  const secureJsonData = options.secureJsonData || {};

  const accessOptions = [
    {
      description: 'The request will be done by the grafana server',
      label: 'Proxy',
      value: EAccess.PROXY
    },
    {
      description: 'The request will be done by your browser',
      label: 'Browser',
      value: EAccess.BROWSER
    }
  ];

  const password =
    jsonData.access === EAccess.PROXY
      ? secureJsonData.password
      : jsonData.password;
  const hasPassword =
    (jsonData.access === EAccess.PROXY && secureJsonFields.password) ||
    (jsonData.access === EAccess.BROWSER && jsonData.password);

  const passwordFieldPlaceHolder = hasPassword ? 'saved' : 'enter password';

  return (
    <div className="gf-form-group">
      <InlineField
        grow={false}
        label="Your Centreon URL"
        labelWidth={20}
        tooltip="The base URL of your Centreon instance. For example http://127.0.0.1/centreon"
      >
        <Input
          value={jsonData.centreonURL}
          width={40}
          onChange={onChangeCentreonURL}
        />
      </InlineField>
      <InlineField
        grow={false}
        label="Access Mode"
        labelWidth={20}
        tooltip="The way Grafana call your Centreon instance. Changing it will reset the saved password"
      >
        <Select<EAccess>
          options={accessOptions}
          value={accessOptions.find(
            (option) => option.value === (jsonData.access || EAccess.PROXY)
          )}
          width={40}
          onChange={onChangeAccessMode}
        />
      </InlineField>
      <InlineField
        grow={false}
        label="Username"
        labelWidth={20}
        tooltip="The best way is to create a Centreon user for this datasource"
      >
        <Input
          value={jsonData.username}
          width={40}
          onChange={onChangeUsername}
        />
      </InlineField>
      <InlineField grow={false} label="Password" labelWidth={20}>
        <Input
          placeholder={passwordFieldPlaceHolder}
          type="password"
          value={password}
          width={40}
          onChange={onChangePassword}
        />
      </InlineField>
    </div>
  );
};
