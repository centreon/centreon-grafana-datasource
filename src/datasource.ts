import { DataQueryRequest, DataQueryResponse, DataSourceApi, DataSourceInstanceSettings } from '@grafana/data';
import { getBackendSrv } from '@grafana/runtime';

import { CentreonMetricOptions, EAccess, ERoutes, ILoginResult, MyQuery } from './types';

export class DataSource extends DataSourceApi<MyQuery, CentreonMetricOptions> {
  private readonly centreonURL: string;
  private readonly access: EAccess;
  private readonly url: string;
  private token?: string;
  private readonly password?: string;
  private readonly username: string;

  constructor(instanceSettings: DataSourceInstanceSettings<CentreonMetricOptions>) {
    super(instanceSettings);

    let { centreonURL } = instanceSettings.jsonData;
    const { access, username, password } = instanceSettings.jsonData;

    //TODO when this can be undefined ?
    if (!instanceSettings.url) {
      throw new Error('instanceSettings.url is undefined !');
    }

    this.url = instanceSettings.url;

    if (centreonURL.slice(-1) === '/') {
      centreonURL = centreonURL.slice(0, -1);
    }
    this.centreonURL = centreonURL;
    this.access = access;
    this.username = username;
    this.password = password;
  }

  async query(options: DataQueryRequest<MyQuery>): Promise<DataQueryResponse> {
    // const { range } = options;
    // const from = range!.from.valueOf();
    // const to = range!.to.valueOf();

    // Return a constant for each query.
    const data = options.targets.map((target) => {});

    return { data };
  }

  // private getUrl(auth?: boolean): string {
  //   if (this.access === EAccess.BROWSER) {
  //     return this.centreonURL;
  //   } else {
  //     return this.url + auth ? ERoutes.LOGIN : ERoutes.API;
  //   }
  // }

  async authenticate() {
    try {
      let data: { security: { credentials: { login: string; password: string } } } | undefined;

      let url = this.access === EAccess.BROWSER ? this.centreonURL + '/api/latest/login' : this.url + ERoutes.LOGIN;
      if (this.access === EAccess.BROWSER) {
        data = {
          security: {
            credentials: {
              login: this.username,
              password: this.password!,
            },
          },
        };
      }

      const result: ILoginResult = await getBackendSrv().post(url, data);
      this.token = result.security.token;

      return result.contact.alias;
    } catch (err) {
      console.error(err);
      if ((err as { status: number } | undefined)?.status === 401) {
        throw new Error('Bad credentials');
      }

      throw new Error('Error access Centreon instance');
    }
  }

  async testDatasource() {
    //useless, but mandatory for the moment
    let a = this.token;
    if (a) {
      a = '';
    }
    console.log(a);

    const username = await this.authenticate();
    // Implement a health check for your data source.
    return {
      status: 'success',
      message: `Connected with user ${username}`,
    };
  }
}
