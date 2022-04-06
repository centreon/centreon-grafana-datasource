import {
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  FieldType,
  MetricFindValue,
  MutableDataFrame,
  ScopedVars,
  SelectableValue,
} from '@grafana/data';
import { FetchError, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { catchError, lastValueFrom, Observable } from 'rxjs';

import {
  CentreonLoginResult,
  CentreonMetricOptions,
  defaultQuery,
  EAccess,
  ERoutes,
  MyQuery,
  StringOrArrayOfStrings,
} from './@types/types';
import { BackendSrvRequest, FetchResponse } from '@grafana/runtime/services/backendSrv';
import { APIError, CentreonList, MBIResourceType, TimeSeriesMetric } from './@types/centreonAPI';
import { SavedFilter } from './@types/SavedFilter';
import { defaults } from 'lodash';

export class CentreonDataSource extends DataSourceApi<MyQuery, CentreonMetricOptions> {
  private readonly APIUrl: string;
  private readonly access: EAccess;
  private readonly url: string;
  private token?: string;
  private readonly password?: string;
  private readonly username: string;
  private readonly centreonURL: string;

  constructor(instanceSettings: DataSourceInstanceSettings<CentreonMetricOptions>) {
    super(instanceSettings);

    let { centreonURL } = instanceSettings.jsonData;
    const { access, username, password } = instanceSettings.jsonData;

    //TODO when this can be undefined ?
    if (!instanceSettings.url) {
      throw new Error('instanceSettings.url is undefined !');
    }

    this.url = instanceSettings.url;
    if (this.url.slice(-1) === '/') {
      this.url = this.url.slice(0, -1);
    }

    if (centreonURL.slice(-1) === '/') {
      centreonURL = centreonURL.slice(0, -1);
    }
    this.centreonURL = centreonURL;
    this.APIUrl = this.centreonURL + '/api/latest';
    this.access = access;
    this.username = username;
    this.password = password;
  }

  private getUrl(): string {
    if (this.access === EAccess.BROWSER) {
      return this.APIUrl;
    } else {
      return this.url + ERoutes.API;
    }
  }

  async authenticate() {
    try {
      let data: { security: { credentials: { login: string; password: string } } } | undefined;

      // access === EAccess.PROXY && this.password is not normal here . Except if you try to configure the datasource
      const useProxy = this.access === EAccess.PROXY && !this.password;

      let url = useProxy ? this.url + ERoutes.LOGIN : this.APIUrl + '/login';
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

      throw new Error(`Error accessing Centreon instance, it is up and running at ${this.centreonURL} ?`);
    }
  }

  private async _call<T>(
    request: BackendSrvRequest,
    opts: Partial<{ authentication: boolean; retry: boolean }> = {}
  ): Promise<Observable<FetchResponse<T>>> {
    let authHeaders: Record<string, string> = {};
    if (!opts.authentication) {
      if (!this.token) {
        await this.authenticate();
      }

      //this.authenticate populate this.token or throw an error
      authHeaders['X-AUTH-TOKEN'] = this.token!;
    }

    return getBackendSrv().fetch<T>({
      ...request,
      url: request.url.slice(0, 1) === '/' ? this.getUrl() + request.url : request.url,
      headers: {
        ...authHeaders,
        ...request.headers,
      },
    });
  }

  private async call<T>(
    request: BackendSrvRequest,
    opts: Partial<{ authentication: boolean; retry: boolean }> = {}
  ): Promise<FetchResponse<T>> {
    return lastValueFrom(
      (await this._call<T>(request, opts)).pipe(
        //if crash, retry
        catchError(async (err) => {
          if (opts.retry === false) {
            if ((err as FetchError<APIError>).data?.message) {
              const fetchError: FetchError<APIError> = err;
              throw new Error(`${fetchError.data?.error} : ${fetchError.data?.message}`);
            }

            throw err;
          } else {
            await this.authenticate();
            return this.call<T>(request, { retry: false });
          }
        })
      )
    );
  }

  async testDatasource() {
    if (!this.username) {
      throw new Error('field Username is mandatory');
    }
    if (!this.APIUrl) {
      throw new Error('field centreonURL is mandatory');
    }
    if (this.access === EAccess.BROWSER && !this.password) {
      throw new Error('field password is mandatory');
    }

    const username = await this.authenticate();
    // Implement a health check for your data source.

    //check if plugin is enabled
    await new Promise<void>(async (resolve, reject) => {
      try {
        const res = await lastValueFrom(
          (
            await this._call<MBIResourceType[]>(
              {
                url: '/data-source/types',
              },
              { retry: false }
            )
          ).pipe(
            catchError(async (err) => {
              console.error(err);
              switch ((err as FetchError<APIError>)?.status) {
                case 400:
                  throw new Error('Unknown error when contacting the Centreon API');
                case 401:
                  throw new Error('This user is not authorized to use this API');
                case 402:
                  throw new Error("The module doesn't have a valid license");
                case 403:
                  throw new Error("The user doesn't have the rights, please validate the ACL on Centreon.");
                case 500:
                default:
                  throw new Error('Fail to use MBI API. Did you install the MBI extension ?');
              }
            })
          )
        );

        console.log(res);

        resolve();
      } catch (e) {
        reject(e);
      }
    });

    return {
      status: 'success',
      message: `Connected with user ${username}`,
    };
  }

  async metricFindQuery(query: MyQuery, options?: any): Promise<MetricFindValue[]> {
    const { resourceType, filters } = query;

    if (!resourceType?.value) {
      return [];
    }

    const filtersPart = (filters || [])
      .map((value) => `${value.type.value?.slug}=${value.filters.map((f) => f.value).join(',')}`)
      .join(' ');
    console.log(`need to query resource "${resourceType?.value.slug}" with filters : ${filtersPart}`);

    return (await this.getResources(resourceType.value, filters)).map(({ label, value }) => ({
      text: label,
      value,
      expandable: false,
    }));
  }

  async query(options: DataQueryRequest<MyQuery>): Promise<DataQueryResponse> {
    const { range } = options;
    const from = range.from.toISOString();
    const to = range.to.toISOString();

    const data: MutableDataFrame[] = [];

    await Promise.all(
      options.targets.map(async (target) => {
        const query = defaults(target, defaultQuery);

        const searchParams = this.generateUrlSearchParamsFilters(query.filters, options.scopedVars);

        searchParams.append('end', to.toString());
        searchParams.append('start', from.toString());
        try {
          //call centreon timeSeries + build DataFrame (one per metric . One call can return multiple metrics)
          (
            await this.call<TimeSeriesMetric[]>({
              url: `/data-source/metrics/timeseries?${searchParams}`,
            })
          ).data.forEach((metric) => {
            data.push(
              new MutableDataFrame({
                refId: query.refId,
                fields: [
                  {
                    type: FieldType.time,
                    name: `${metric.name}.time`,
                    values: metric.timeserie
                      .filter((e) => e.value !== null)
                      .map((element) => new Date(element.datetime)),
                  },
                  {
                    name: metric.name,
                    type: FieldType.number,
                    values: metric.timeserie.filter((e) => e.value !== null).map((element) => element.value),
                    config: {
                      unit: metric.unit,
                    },
                  },
                ],
              })
            );
          });
        } catch (e) {
          console.error(e);
          throw e;
        }
      })
    );

    return { data };
  }

  async getResourceList(): Promise<Array<SelectableValue<MBIResourceType>>> {
    return (
      await this.call<MBIResourceType[]>({
        url: '/data-source/types',
      })
    ).data.map((type) => ({
      label: type.display_name,
      value: {
        ...type,
        //keep only the last part of the list_endpoint
        list_endpoint: type.list_endpoint.split('/').pop() || '',
      },
    }));
  }

  private convertArrayOfSavedFilterToMap(params?: SavedFilter[]): Map<string, string[]> {
    const standardsFilters: Map<string, string[]> = new Map<string, string[]>();

    if (!params) {
      return standardsFilters;
    }

    params
      //check we have a type
      .filter(({ type }) => !!type.value)
      .forEach(({ type, filters }) => {
        standardsFilters.set(
          type.value?.slug!,
          //filter empty filters, and save array
          filters.filter(({ value }) => !!value).map(({ value }) => value!)
        );
      });

    return standardsFilters;
  }

  private convertRecordOfStringsFilterToMap(params?: Record<string, StringOrArrayOfStrings>): Map<string, string[]> {
    const standardsFilters: Map<string, string[]> = new Map<string, string[]>();

    if (!params) {
      return standardsFilters;
    }

    (
      Object.entries(params)
        //filter params without type, or without filters, or empty filters
        .filter(
          ([type, pFilters]) => type && pFilters && Array.isArray(pFilters) && pFilters.filter((f) => !!f)
        ) as Array<[string, string | string[]]>
    )
      //then add them in map
      .forEach(([type, pFilters]) => {
        const filters = Array.isArray(pFilters) ? pFilters : [pFilters];
        standardsFilters.set(type, filters);
      });

    return standardsFilters;
  }

  private interpolateVariables(
    inputFilters: Map<string, string[]>,
    scopedVars?: ScopedVars
  ): Array<[string, string[]]> {
    const templateSrv = getTemplateSrv();

    if (!templateSrv) {
      return Array.from(inputFilters);
    }

    // interpolates variables from type and array
    return Array.from(inputFilters).map(([type, pFilters]) => {
      const filters = pFilters
        .map((filter) => {
          const filterParsed = templateSrv.replace(filter || '', scopedVars, 'json');
          //if replace doesn't change . It doesn't contain a variable
          if (filter === filterParsed) {
            return filter;
          }

          //else try to json parse it . And check we have strings or equivalent
          const tmpNewFilters = JSON.parse(filterParsed);
          const newFilters = Array.isArray(tmpNewFilters) ? tmpNewFilters : [tmpNewFilters];

          newFilters.forEach((value) => {
            // disable eqeqeq to check if value to string == value (like a number)
            /* eslint eqeqeq: "off" */
            if (value != value.toString() || typeof value.toString() !== 'string') {
              throw new Error(`filter "${value}" seems to not be a string`);
            }
          });

          return newFilters;
        })
        .flat();
      return [type, filters];
    });
  }

  private generateUrlSearchParamsFilters(
    params?: Record<string, undefined | string | Array<undefined | string>> | SavedFilter[],
    scopedVars?: ScopedVars
  ): URLSearchParams {
    // convert filters to a standards format
    let standardsFilters: Map<string, string[]> = new Map<string, string[]>();

    if (Array.isArray(params)) {
      standardsFilters = this.convertArrayOfSavedFilterToMap(params);
    } else if (params) {
      standardsFilters = this.convertRecordOfStringsFilterToMap(params);
    }

    const finalArray = this.interpolateVariables(standardsFilters, scopedVars);

    const searchParams = new URLSearchParams();

    Array.from(finalArray).forEach(([type, filters]: [string, string[]]) => {
      filters.forEach((filter) => searchParams.append(`${type}[]`, filter));
    });

    return searchParams;
  }

  async getResources(
    resourceType: MBIResourceType,
    params?: Record<string, undefined | string | Array<undefined | string>> | SavedFilter[]
  ): Promise<Array<{ label: string; value: string }>> {
    if (resourceType.list_endpoint === '') {
      return [];
    }

    return (
      await this.call<CentreonList<{ id: string; name: string }>>({
        url: `/data-source/${resourceType.list_endpoint}${
          params ? '?' + this.generateUrlSearchParamsFilters(params) : ''
        }`,
      })
    ).data.result.map(({ name }) => ({ label: name, value: name }));
    //use ID or name in the value ?
  }

  buildRawQuery(filters?: SavedFilter[]): string {
    return (filters || [])
      .filter((value) => value.type && value.filters.length > 0)
      .map((value) => `${value.type.value?.slug}="${value.filters.map((f) => f.value).join('","')}"`)
      .join(' ');
  }

  async buildFiltersQuery(rawSelector?: string): Promise<SavedFilter[]> {
    const types = await this.getResourceList();

    return (rawSelector || '')
      ?.split(' ')
      .filter((v) => !!v)
      .map((group) => group.split('='))
      .map(([type, filters]) => {
        const currentType: SelectableValue<MBIResourceType> | undefined = types.find((t) => t.value?.slug === type);

        if (!currentType) {
          throw new Error(`fail to find type "${type}"`);
        }

        return {
          id: Date.now(),
          type: {
            label: type,
            value: currentType.value,
          },
          filters: [...(',' + filters).matchAll(/[=,](?:"([^"]*(?:""[^"]*)*)"|([^",\r\n]*))/gi)].map((fullMatch) => {
            const [, m1, m2, m3] = fullMatch;
            const filter = m1 || m2 || m3;
            if (!filter) {
              throw new Error(`something is wrong with the current filter : ${JSON.stringify(fullMatch)}`);
            }
            return {
              label: filter,
              value: filter,
            };
          }),
        };
      });
  }
}
