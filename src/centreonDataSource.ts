import {
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  FieldType,
  MetricFindValue,
  MutableDataFrame,
} from '@grafana/data';
import { getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { lastValueFrom } from 'rxjs';

import {
  CentreonLoginResult,
  CentreonMetricOptions,
  defaultQuery,
  EAccess,
  ERoutes,
  MyQuery,
  MyVariableQuery,
} from './types';
import { defaults } from 'lodash';
import { BackendSrvRequest, FetchResponse } from '@grafana/runtime/services/backendSrv';

export class CentreonDataSource extends DataSourceApi<MyQuery, CentreonMetricOptions> {
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

  async metricFindQuery(query: MyVariableQuery, options?: any): Promise<Array<MetricFindValue>> {
    console.log(query, options);
    // Retrieve DataQueryResponse based on query.
    // const response = await this.fetchMetricNames(query.namespace, query.rawQuery);
    //
    // // Convert query results to a MetricFindValue[]
    // const values = response.data.map(frame => ({ text: frame.name }));
    //
    // return values;

    return [
      {
        text: 'tata',
        value: 0,
        expandable: false,
      },
      {
        text: 'tutu',
        value: 1,
        expandable: false,
      },
    ];
  }

  async query(options: DataQueryRequest<MyQuery>): Promise<DataQueryResponse> {
    const { range } = options;
    const from = range!.from.valueOf();
    const to = range!.to.valueOf();

    const data = await Promise.all(
      options.targets.map((target) => {
        console.log(getTemplateSrv().replace(target.queryText, options.scopedVars));

        // Your code goes here.
        const query = defaults(target, defaultQuery);
        const frame = new MutableDataFrame({
          refId: query.refId,
          fields: [
            { name: 'time', type: FieldType.time },
            { name: 'value', type: FieldType.number },
          ],
        });

        // duration of the time range, in milliseconds.
        const duration = to - from;

        // step determines how close in time (ms) the points will be to each other.
        const step = duration / 1000;

        for (let t = 0; t < duration; t += step) {
          frame.add({ time: from + t, value: Math.sin((2 * Math.PI * query.frequency * t) / duration) });
        }
      })
    );

    return { data };
  }

  private getUrl(): string {
    if (this.access === EAccess.BROWSER) {
      return this.centreonURL;
    } else {
      return this.url + ERoutes.API;
    }
  }

  async authenticate() {
    try {
      let data: { security: { credentials: { login: string; password: string } } } | undefined;

      // access === EAccess.PROXY && this.password is not normal here . Except if you try to configure the datasource
      const useProxy = this.access === EAccess.PROXY && !this.password;

      let url = useProxy ? this.url + ERoutes.LOGIN : this.centreonURL + '/api/latest/login';
      if (!useProxy) {
        data = {
          security: {
            credentials: {
              login: this.username,
              password: this.password!,
            },
          },
        };
      }

      const result: CentreonLoginResult = await getBackendSrv().post(url, data);
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

  private async call<T>(
    request: BackendSrvRequest,
    opts: Partial<{ authentication: boolean; retry: boolean }> = {}
  ): Promise<FetchResponse<T>> {
    let authHeaders: Record<string, string> = {};
    if (!opts.authentication) {
      if (!this.token) {
        await this.authenticate();
      }

      debugger;
      //this.authenticate populate this.token or throw an error
      authHeaders['X-AUTH-TOKEN'] = this.token!;
    }

    const reqObs = getBackendSrv().fetch<T>({
      ...request,
      url: request.url.slice(0, 1) === '/' ? this.getUrl() + request.url : request.url,
      headers: {
        ...authHeaders,
        ...request.headers,
      }
    });

    return lastValueFrom(reqObs);
  }

  async testDatasource() {
    if (!this.username) {
      throw new Error('field Username is mandatory');
    }
    if (!this.centreonURL) {
      throw new Error('field centreonURL is mandatory');
    }
    if (!this.password) {
      throw new Error('field password is mandatory');
    }

    const username = await this.authenticate();
    // Implement a health check for your data source.
    return {
      status: 'success',
      message: `Connected with user ${username}`,
    };
  }

  async getResourceList(): Promise<Array<{ value: string; label: string }>> {
    return (
      await this.call<Array<{ value: string; label: string }>>({
        url: '/resource',
      })
    ).data;
  }
}
