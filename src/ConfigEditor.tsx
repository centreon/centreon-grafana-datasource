import React, { ChangeEvent, PureComponent } from 'react';
import { InlineField, Input, Select } from '@grafana/ui';
import { DataSourcePluginOptionsEditorProps, SelectableValue } from '@grafana/data';
import { CentreonMetricOptions, EAccess, CentreonMetricSecureDatas } from './types';

interface Props extends DataSourcePluginOptionsEditorProps<CentreonMetricOptions, CentreonMetricSecureDatas> {}

interface State {}

export class ConfigEditor extends PureComponent<Props, State> {
  onChangeCentreonURL = (event: ChangeEvent<HTMLInputElement>) => {
    const { onOptionsChange, options } = this.props;

    let centreonURL = event.target.value;

    const jsonData = {
      ...options.jsonData,
      centreonURL,
    };
    onOptionsChange({
      ...options,
      jsonData: jsonData,
    });
  };

  onChangeUsername = (event: ChangeEvent<HTMLInputElement>) => {
    const { onOptionsChange, options } = this.props;

    const jsonData = {
      ...options.jsonData,
      username: event.target.value,
    };
    onOptionsChange({
      ...options,
      jsonData: jsonData,
    });
  };

  // Secure field (only sent to the backend)
  onChangePassword = (event: ChangeEvent<HTMLInputElement>) => {
    const { onOptionsChange, options } = this.props;

    const { value } = event.target;

    let secureJsonData = options.secureJsonData || {};
    let secureJsonFields = options.secureJsonFields;
    let jsonData = options.jsonData;
    if (options.jsonData.access === EAccess.PROXY) {
      secureJsonData.password = value;
      jsonData.password = '';
    } else {
      jsonData.password = value;
      secureJsonFields.password = false;
      secureJsonData.password = '';
    }

    onOptionsChange({
      ...options,
      jsonData,
      secureJsonData,
    });
  };

  onChangeAccessMode = (selected: SelectableValue<EAccess>) => {
    const { onOptionsChange, options } = this.props;

    if (!selected?.value) {
      return;
    }

    const jsonData = {
      ...options.jsonData,
      access: selected.value,
      password: '',
    };
    onOptionsChange({
      ...options,
      jsonData: jsonData,
      secureJsonFields: {
        password: false,
      },
      secureJsonData: {
        password: '',
      },
    });
  };

  render() {
    const { options } = this.props;
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
            <Input width={40} value={jsonData.centreonURL} onChange={this.onChangeCentreonURL} />
          </InlineField>
          <InlineField
            label="Access Mode"
            tooltip="The way Grafana call your Centreon instance. Changing it will reset username/password"
            labelWidth={20}
            grow={false}
          >
            <Select<any>
              options={accessOptions}
              value={accessOptions.find((option) => option.value === jsonData.access)}
              onChange={this.onChangeAccessMode}
              width={40}
            />
          </InlineField>
          <InlineField
            label="Username"
            tooltip="The best way is to create a Centreon user for this datasource"
            labelWidth={20}
            grow={false}
          >
            <Input width={40} value={jsonData.username} onChange={this.onChangeUsername} />
          </InlineField>
          <InlineField label="Password" labelWidth={20} grow={false}>
            <Input
              type="password"
              width={40}
              placeholder={hasPassword ? 'saved' : 'enter password'}
              value={password}
              onChange={this.onChangePassword}
            />
          </InlineField>
        </div>
      </>
    );
  }
}
