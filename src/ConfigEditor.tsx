import React, { ChangeEvent, PureComponent } from 'react';
import { Field, LegacyForms, Select } from '@grafana/ui';
import { DataSourcePluginOptionsEditorProps, SelectableValue } from '@grafana/data';
import { MyDataSourceOptions, MySecureJsonData } from './types';
import { ActionMeta } from '@grafana/ui/components/Select/types';

const { SecretFormField, FormField } = LegacyForms;

interface Props extends DataSourcePluginOptionsEditorProps<MyDataSourceOptions> {}

interface State {}

export class ConfigEditor extends PureComponent<Props, State> {
  onURLChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onOptionsChange, options } = this.props;
    const jsonData = {
      ...options.jsonData,
      path: event.target.value,
    };
    onOptionsChange({ ...options, jsonData });
  };

  onProxyChange = (value: SelectableValue<string>, actionMeta: ActionMeta): {} | void => {
    // const { onOptionsChange, options } = this.props;
    // const jsonData = {
    //   ...options.jsonData,
    //   path: event.target.value,
    // };
    // onOptionsChange({ ...options, jsonData });
    console.log(value);
  };

  // Secure field (only sent to the backend)
  onAPIKeyChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onOptionsChange, options } = this.props;
    onOptionsChange({
      ...options,
      secureJsonData: {
        apiKey: event.target.value,
      },
    });
  };

  onResetAPIKey = () => {
    const { onOptionsChange, options } = this.props;
    onOptionsChange({
      ...options,
      secureJsonFields: {
        ...options.secureJsonFields,
        apiKey: false,
      },
      secureJsonData: {
        ...options.secureJsonData,
        apiKey: '',
      },
    });
  };

  render() {
    const { options } = this.props;
    const { jsonData, secureJsonFields } = options;
    const secureJsonData = (options.secureJsonData || {}) as MySecureJsonData;

    const selectOptions = [
      { label: 'Basic option', value: 'proxy' },
      { label: 'Option with description', value: 'access', description: 'this is a description' },
    ];

    const selectedOption = selectOptions.filter((option) => options.jsonData.access === option.value);

    return (
      <div className="gf-form-group">
        <h2>HTTP Address</h2>
        <div className="gf-form">
          <FormField
            label="URL"
            labelWidth={6}
            inputWidth={20}
            onChange={this.onURLChange}
            value={jsonData.url || ''}
            placeholder="url of your centreon instance"
          />
        </div>

        <div className="gf-form">
          <Field>
            <Select options={selectOptions} value={selectedOption} onChange={this.onProxyChange} />
          </Field>
        </div>

        <div className="gf-form-inline">
          <div className="gf-form">
            <SecretFormField
              isConfigured={secureJsonFields.apiKey}
              value={secureJsonData.password || ''}
              label="API Key"
              placeholder="secure json field (backend only)"
              labelWidth={6}
              inputWidth={20}
              onReset={this.onResetAPIKey}
              onChange={this.onAPIKeyChange}
            />
          </div>
        </div>
      </div>
    );
  }
}
