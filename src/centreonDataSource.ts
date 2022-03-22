import {
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  FieldType,
  MetricFindValue,
  MutableDataFrame,
} from '@grafana/data';
import { FetchError, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { catchError, lastValueFrom } from 'rxjs';

import { CentreonLoginResult, CentreonMetricOptions, defaultQuery, EAccess, ERoutes, MyQuery } from './@types/types';
import { defaults } from 'lodash';
import { BackendSrvRequest, FetchResponse } from '@grafana/runtime/services/backendSrv';
import { CentreonList } from './@types/centreonAPI';
import { ISavedFilter } from './@types/ISavedFilter';

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
    this.centreonURL = centreonURL + '/api/latest';
    this.access = access;
    this.username = username;
    this.password = password;
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

      let url = useProxy ? this.url + ERoutes.LOGIN : this.centreonURL + '/login';
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

      //this.authenticate populate this.token or throw an error
      authHeaders['X-AUTH-TOKEN'] = this.token!;
    }

    const reqObs = getBackendSrv().fetch<T>({
      ...request,
      url: request.url.slice(0, 1) === '/' ? this.getUrl() + request.url : request.url,
      headers: {
        ...authHeaders,
        ...request.headers,
      },
    });

    //if crash, retry
    const res = reqObs.pipe(
      catchError(async (err) => {
        if (opts.retry) {
          if ((err as FetchError<{ message: string }>).data?.message) {
            const fetchError: FetchError<{
              message: string;
              error: string;
              response: string;
            }> = err;
            throw new Error(`${fetchError.data?.error} : ${fetchError.data?.message}`);
          }

          throw err;
        } else {
          await this.authenticate();
          return this.call<T>(request, { retry: true });
        }
      })
    );

    return lastValueFrom(res);
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

  async metricFindQuery(query: MyQuery, options?: any): Promise<Array<MetricFindValue>> {
    const { resourceType, filters } = query;

    if (!resourceType?.value) {
      return [];
    }

    const filtersPart = (filters || [])
      .map((value) => `${value.type.value}=${value.filters.map((f) => f.value).join(',')}`)
      .join(' ');
    console.log(`need to query resource "${resourceType?.value}" with filters : ${filtersPart}`);

    return (await this.getResources(resourceType.value, filters)).map(({ label, value }) => ({
      text: label,
      value,
      expandable: false,
    }));
  }

  async query(options: DataQueryRequest<MyQuery>): Promise<DataQueryResponse> {
    const { range } = options;
    const from = range!.from.valueOf();
    const to = range!.to.valueOf();

    const data = await Promise.all(
      options.targets.map((target) => {
        console.log(getTemplateSrv().replace(target.rawSelector, options.scopedVars));

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
          frame.add({ time: from + t, value: Math.sin((2 * Math.PI * t) / duration) });
        }
      })
    );

    return { data };
  }

  async getResourceList(): Promise<Array<{ value: string; label: string }>> {
    return (
      await this.call<
        CentreonList<{
          slug: string;
          display_name: string;
        }>
      >({
        url: '/data-source/types',
      })
    ).data.result.map(({ slug, display_name }) => ({ label: display_name, value: slug }));
  }

  // private generateQuery(params?: Record<string, undefined | string | Array<undefined | string>> | Array<ISavedFilter>): Record<string, string> {
  //
  // }

  async getResources(
    resourceType: string,
    params?: Record<string, undefined | string | Array<undefined | string>> | Array<ISavedFilter>
  ): Promise<Array<{ label: string; value: string }>> {
    // TODO organise the query + exploit variables

    console.log(resourceType, params);

    return (
      await this.call<CentreonList<{ id: string; name: string }>>({
        url: `/data-source/${resourceType}`,
        params,
      })
    ).data.result.map(({ id, name }) => ({ label: name, value: id }));
  }

  buildRawQuery(filters?: Array<ISavedFilter>): string {
    return (filters || [])
      .filter((value) => value.type && value.filters.length > 0)
      .map((value) => `${value.type.value}="${value.filters.map((f) => f.value).join(',')}"`)
      .join(' ');
  }

  buildFiltersQuery(rawSelector?: string): Array<ISavedFilter> {
    // TODO parse ( for the moment only imagine filters like (3 hosts) : host="tutu,tata,titi"

    return (rawSelector || '')
      ?.split(' ')
      .filter((v) => !!v)
      .map((group) => group.split('='))
      .map(([type, filters]) => ({
        type: {
          label: type,
          value: type,
        },
        filters: filters.split(',').map((f) => {
          const value = f.slice(1, -1);

          return {
            label: value,
            value,
          };
        }),
      }));
  }
}
