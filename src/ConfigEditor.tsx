import React, { ChangeEvent } from 'react';
import { InlineField, Input, Select } from '@grafana/ui';
import { DataSourcePluginOptionsEditorProps, SelectableValue } from '@grafana/data';
import { CentreonMetricOptions, CentreonMetricSecureDatas, EAccess } from './@types/types';

interface Props extends DataSourcePluginOptionsEditorProps<CentreonMetricOptions, CentreonMetricSecureDatas> {}

export const ConfigEditor = (props: Props) => {
  const { onOptionsChange, options } = props;
  const onChangeCentreonURL = (event: ChangeEvent<HTMLInputElement>) => {
    let centreonURL = event.target.value;

    const newJSONData = {
      ...options.jsonData,
      centreonURL,
    };
    onOptionsChange({
      ...options,
      jsonData: newJSONData,
    });
  };

  const onChangeUsername = (event: ChangeEvent<HTMLInputElement>) => {
    const newJSONData = {
      ...options.jsonData,
      username: event.target.value,
    };
    onOptionsChange({
      ...options,
      jsonData: newJSONData,
    });
  };

  // Secure field (only sent to the backend)
  const onChangePassword = (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;

    let newSecureJsonData = options.secureJsonData || {};
    let newSecureJsonFields = options.secureJsonFields;
    let newJSONData = options.jsonData;
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
      secureJsonFields: newSecureJsonFields,
      jsonData: newJSONData,
      secureJsonData: newSecureJsonData,
    });
  };

  const onChangeAccessMode = (selected: SelectableValue<EAccess>) => {
    if (!selected?.value) {
      return;
    }

    const newJSONData = {
      ...options.jsonData,
      access: selected.value,
      password: '',
    };
    onOptionsChange({
      ...options,
      jsonData: newJSONData,
      secureJsonFields: {
        password: false,
      },
      secureJsonData: {
        password: '',
      },
    });
  };

  const { jsonData, secureJsonFields } = options;
  const secureJsonData = options.secureJsonData || {};

  const accessOptions = [
    { label: 'Proxy', value: EAccess.PROXY, description: 'The request will be done by the grafana server' },
    { label: 'Browser', value: EAccess.BROWSER, description: 'The request will be done by your browser' },
  ];

  const password = jsonData.access === EAccess.PROXY ? secureJsonData.password : jsonData.password;
  const hasPassword =
    (jsonData.access === EAccess.PROXY && secureJsonFields.password) ||
    (jsonData.access === EAccess.BROWSER && jsonData.password);

  return (
    <>
      <div className="gf-form-group">
        <InlineField
          label="Your Centreon URL"
          tooltip="The base URL of your Centreon instance. For example http://127.0.0.1/centreon"
          labelWidth={20}
          grow={false}
        >
          <Input width={40} value={jsonData.centreonURL} onChange={onChangeCentreonURL} />
        </InlineField>
        <InlineField
          label="Access Mode"
          tooltip="The way Grafana call your Centreon instance. Changing it will reset the saved password"
          labelWidth={20}
          grow={false}
        >
          <Select<EAccess>
            options={accessOptions}
            value={accessOptions.find((option) => option.value === (jsonData.access || EAccess.PROXY))}
            onChange={onChangeAccessMode}
            width={40}
          />
        </InlineField>
        <InlineField
          label="Username"
          tooltip="The best way is to create a Centreon user for this datasource"
          labelWidth={20}
          grow={false}
        >
          <Input width={40} value={jsonData.username} onChange={onChangeUsername} />
        </InlineField>
        <InlineField label="Password" labelWidth={20} grow={false}>
          <Input
            type="password"
            width={40}
            placeholder={hasPassword ? 'saved' : 'enter password'}
            value={password}
            onChange={onChangePassword}
          />
        </InlineField>
      </div>
    </>
  );
};
