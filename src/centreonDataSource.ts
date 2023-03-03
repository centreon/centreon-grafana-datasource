import {
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  FieldType,
  MetricFindValue,
  MutableDataFrame,
  ScopedVars,
  SelectableValue
} from '@grafana/data';
import { FetchError, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { catchError, lastValueFrom, Observable } from 'rxjs';
import type {
  BackendSrvRequest,
  FetchResponse
} from '@grafana/runtime/services/backendSrv';
import { defaults } from 'lodash';

import {
  CentreonLoginResult,
  CentreonMetricOptions,
  defaultQuery,
  EAccess,
  ERoutes,
  MyQuery,
  StringOrArrayOfStrings
} from './@types/types';
import {
  APIError,
  ApiErrorOrGrafanaProxyError,
  CentreonList,
  GrafanaProxyError,
  MBIResourceType,
  TimeSeriesMetric
} from './@types/centreonAPI';
import { SavedFilter } from './@types/SavedFilter';

export class CentreonDataSource extends DataSourceApi<
  MyQuery,
  CentreonMetricOptions
> {
  private readonly APIUrl: string;

  private readonly access: EAccess;

  private readonly url: string;

  private token?: string;

  private readonly password?: string;

  private readonly username: string;

  private readonly centreonURL: string;

  private readonly typesLimit = 100;

  public constructor(
    instanceSettings: DataSourceInstanceSettings<CentreonMetricOptions>
  ) {
    super(instanceSettings);

    let { centreonURL } = instanceSettings.jsonData;
    const { access, username, password } = instanceSettings.jsonData;

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
    this.APIUrl = `${this.centreonURL}/api/latest`;
    this.access = access;
    this.username = username;
    this.password = password;
  }

  private getUrl(): string {
    if (this.access === EAccess.BROWSER) {
      return this.APIUrl;
    }

    return this.url + ERoutes.API;
  }

  public async authenticate(): Promise<string> {
    try {
      let data:
        | { security: { credentials: { login: string; password: string } } }
        | undefined;

      // access === EAccess.PROXY && this.password is not normal here . Except if you try to configure the datasource
      const useProxy = this.access === EAccess.PROXY && !this.password;

      const url = useProxy ? this.url + ERoutes.LOGIN : `${this.APIUrl}/login`;
      if (!useProxy && this.password) {
        data = {
          security: {
            credentials: {
              login: this.username,
              password: this.password
            }
          }
        };
      }

      const result: CentreonLoginResult = await getBackendSrv().post(url, data);
      this.token = result.security.token;

      return result.contact.alias;
    } catch (err) {
      console.error(err);
      if ((err as { status: number } | undefined)?.status) {
        const status = (err as { status: number } | undefined)?.status;

        if (status === 401) {
          throw new Error('Bad credentials');
        }
      }

      this.manageHTTPError(err);
      // manageHTTPError need to throw before this
      console.error(err);
      throw new Error(`Unknown error`);
    }
  }

  /**
   * will try to manageHTTPError
   * Throw exception if succeed
   */
  private manageHTTPError(
    err: FetchError<ApiErrorOrGrafanaProxyError> | unknown
  ): void {
    if (
      (err as FetchError<ApiErrorOrGrafanaProxyError>).status != undefined &&
      (err as FetchError<ApiErrorOrGrafanaProxyError>).data != undefined &&
      (err as FetchError<ApiErrorOrGrafanaProxyError>).statusText != undefined
    ) {
      const { status, data, statusText } =
        err as FetchError<ApiErrorOrGrafanaProxyError>;

      enum Errors {
        API_NOT_FOUND = 'Fail to call the API, did you install the MBI extension ?',
        BAD_REQUEST = 'Unknown error when contacting the Centreon API',
        LICENSE_REQUIRED = "The module doesn't have a valid license",
        NO_RIGHTS = "The user doesn't have the rights, please validate the ACL on Centreon.",
        UNAUTHORIZED = 'This user is not authorized to use this API',
        SERVER_ERROR = 'Fail to use MBI API. Did you install the MBI extension ?',
        DEFAULT = `Error accessing Centreon instance, it is up and running at {{centreonURL}} ?`
      }

      if ((data as APIError).code !== undefined) {
        const apiErr = data as APIError;

        // check if the error start with "no route found", telling us the API is not here
        if (apiErr.message?.toLowerCase().startsWith('no route found')) {
          throw new Error(Errors.API_NOT_FOUND);
        }

        // check specific status code
        switch (status) {
          case 401:
            throw new Error(Errors.LICENSE_REQUIRED);
          case 402:
            throw new Error(Errors.NO_RIGHTS);
          case 403:
            throw new Error(Errors.UNAUTHORIZED);
          // eslint need default
          default:
        }

        // check if we get an api error message
        if (apiErr.message) {
          throw new Error(`Centreon return an error "${apiErr.message}"`);
        }

        // not detected error, use defaults messages
        switch (status) {
          case 500:
            throw new Error(Errors.SERVER_ERROR);
          case 400:
            throw new Error(Errors.BAD_REQUEST);
          default:
            // use default error
            throw new Error(
              Errors.DEFAULT.replace('{{centreonURL}}', this.centreonURL)
            );
        }
      } else if ((data as GrafanaProxyError).error !== undefined) {
        const proxyErr = data as GrafanaProxyError;
        throw new Error(`${proxyErr?.error} : ${proxyErr?.message}`);
      }

      if (statusText) {
        throw new Error(`Unknown error ${statusText}`);
      }
    }

    // eslint-disable-next-line no-console
    console.log('manageHTTPError unknown error', err);
  }

  private async privateCall<T>(
    request: BackendSrvRequest,
    opts: Partial<{ authentication: boolean; retry: boolean }> = {}
  ): Promise<Observable<FetchResponse<T>>> {
    const authHeaders: Record<string, string> = {};
    if (!opts.authentication) {
      if (!this.token) {
        await this.authenticate();
      }

      // this.authenticate populate this.token or throw an error => this condition is only here for the linter
      if (!this.token) {
        throw new Error('something is wrong');
      }

      authHeaders['X-AUTH-TOKEN'] = this.token;
    }

    return getBackendSrv().fetch<T>({
      ...request,
      headers: {
        ...authHeaders,
        ...request.headers
      },
      url:
        request.url.slice(0, 1) === '/'
          ? this.getUrl() + request.url
          : request.url
    });
  }

  private async call<T>(
    request: BackendSrvRequest,
    opts: Partial<{ authentication: boolean; retry: boolean }> = {}
  ): Promise<FetchResponse<T>> {
    return lastValueFrom(
      (await this.privateCall<T>(request, opts)).pipe(
        // if crash, retry
        catchError(async (err) => {
          if (opts.retry === false) {
            this.manageHTTPError(err);

            throw err;
          } else {
            await this.authenticate();

            return this.call<T>(request, { retry: false });
          }
        })
      )
    );
  }

  public async testDatasource(): Promise<{
    message: string;
    status: string;
  }> {
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

    // check if plugin is enabled
    await lastValueFrom(
      (
        await this.privateCall<Array<MBIResourceType>>(
          {
            url: '/data-source/types'
          },
          { retry: false }
        )
      ).pipe(
        catchError(async (err) => {
          this.manageHTTPError(err);
        })
      )
    );

    return {
      message: `Connected with user ${username}`,
      status: 'success'
    };
  }

  public async metricFindQuery(
    query: MyQuery
  ): Promise<Array<MetricFindValue>> {
    const { resourceType, filters } = query;

    if (!resourceType?.value) {
      return [];
    }

    return (await this.getResources(resourceType.value, filters)).map(
      ({ label, value }) => ({
        expandable: false,
        text: label,
        value
      })
    );
  }

  public async query(
    options: DataQueryRequest<MyQuery>
  ): Promise<DataQueryResponse> {
    const { range } = options;
    const from = range.from.toISOString();
    const to = range.to.toISOString();

    const data: Array<MutableDataFrame> = [];

    await Promise.all(
      options.targets.map(async (target) => {
        const query = defaults(target, defaultQuery);

        const searchParams = CentreonDataSource.generateUrlSearchParamsFilters(
          query.filters,
          options.scopedVars
        );

        searchParams.append('end', to.toString());
        searchParams.append('start', from.toString());
        try {
          // call centreon timeSeries + build DataFrame (one per metric . One call can return multiple metrics)
          (
            await this.call<Array<TimeSeriesMetric>>({
              url: `/data-source/metrics/timeseries?${searchParams}`
            })
          ).data.forEach((metric) => {
            data.push(
              new MutableDataFrame({
                fields: [
                  {
                    labels: {
                      ...metric.labels,
                      metric_name: metric.name
                    },
                    name: `${metric.name}.time`,
                    type: FieldType.time,
                    values: metric.timeserie
                      .filter((e) => e.value !== null)
                      .map((element) => new Date(element.datetime))
                  },
                  {
                    config: {
                      unit: metric.unit
                    },
                    labels: {
                      ...metric.labels,
                      metric_name: metric.name
                    },
                    name: metric.name,
                    type: FieldType.number,
                    values: metric.timeserie
                      .filter((e) => e.value !== null)
                      .map((element) => element.value)
                  }
                ],
                refId: query.refId
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

  public async getResourceList(): Promise<
    Array<SelectableValue<MBIResourceType>>
  > {
    return (
      await this.call<Array<MBIResourceType>>({
        url: '/data-source/types'
      })
    ).data.map((type) => ({
      label: type.display_name,
      value: {
        ...type,
        // keep only the last part of the list_endpoint
        list_endpoint: type.list_endpoint.split('/').pop() || ''
      }
    }));
  }

  private static convertArrayOfSavedFilterToMap(
    params?: Array<SavedFilter>
  ): Map<string, Array<string>> {
    const standardsFilters: Map<string, Array<string>> = new Map<
      string,
      Array<string>
    >();

    if (!params) {
      return standardsFilters;
    }

    (
      params
        // check we have a type
        .filter(({ type }) => !!type.value?.slug) as Array<
        SavedFilter & {
          type: { value: MBIResourceType };
        }
      >
    ).forEach(({ type, filters }) => {
      standardsFilters.set(
        type.value.slug,
        // filter empty filters, and save array
        (
          filters.filter(({ value }) => !!value) as Array<{ value: string }>
        ).map(({ value }) => value)
      );
    });

    return standardsFilters;
  }

  private static convertRecordOfStringsFilterToMap(
    params?: Record<string, StringOrArrayOfStrings>
  ): Map<string, Array<string>> {
    const standardsFilters: Map<string, Array<string>> = new Map<
      string,
      Array<string>
    >();

    if (!params) {
      return standardsFilters;
    }

    (
      Object.entries(params)
        // filter params without type, or without filters, or empty filters
        .filter(
          ([type, pFilters]) =>
            type &&
            pFilters &&
            Array.isArray(pFilters) &&
            pFilters.filter((f) => !!f)
        ) as Array<[string, string | Array<string>]>
    )
      // then add them in map
      .forEach(([type, pFilters]) => {
        const filters = Array.isArray(pFilters) ? pFilters : [pFilters];
        standardsFilters.set(type, filters);
      });

    return standardsFilters;
  }

  private static interpolateVariables(
    inputFilters: Map<string, Array<string>>,
    scopedVars?: ScopedVars
  ): Array<[string, Array<string>]> {
    const templateSrv = getTemplateSrv();

    if (!templateSrv) {
      return Array.from(inputFilters);
    }

    // interpolates variables from type and array
    return Array.from(inputFilters).map(([type, pFilters]) => {
      const filters = pFilters
        .map((filter) => {
          const filterParsed = templateSrv.replace(
            filter || '',
            scopedVars,
            'json'
          );
          // if replace doesn't change . It doesn't contain a variable
          if (filter === filterParsed) {
            return filter;
          }

          // else try to json parse it . And check we have strings or equivalent
          const tmpNewFilters = JSON.parse(filterParsed);
          const newFilters = Array.isArray(tmpNewFilters)
            ? tmpNewFilters
            : [tmpNewFilters];

          newFilters.forEach((value) => {
            // disable eqeqeq to check if value to string == value (like a number)
            /* eslint eqeqeq: "off" */
            if (
              value != value.toString() ||
              typeof value.toString() !== 'string'
            ) {
              throw new Error(`filter "${value}" seems to not be a string`);
            }
          });

          return newFilters;
        })
        .flat();

      return [type, filters];
    });
  }

  private static generateUrlSearchParamsFilters(
    params?:
      | Record<string, undefined | string | Array<undefined | string>>
      | Array<SavedFilter>,
    scopedVars?: ScopedVars
  ): URLSearchParams {
    // convert filters to a standards format
    let standardsFilters: Map<string, Array<string>> = new Map<
      string,
      Array<string>
    >();

    if (Array.isArray(params)) {
      standardsFilters =
        CentreonDataSource.convertArrayOfSavedFilterToMap(params);
    } else if (params) {
      standardsFilters =
        CentreonDataSource.convertRecordOfStringsFilterToMap(params);
    }

    const finalArray = CentreonDataSource.interpolateVariables(
      standardsFilters,
      scopedVars
    );

    const searchParams = new URLSearchParams();

    Array.from(finalArray).forEach(
      ([type, filters]: [string, Array<string>]) => {
        filters.forEach((filter) => searchParams.append(`${type}[]`, filter));
      }
    );

    return searchParams;
  }

  public async getResources(
    resourceType: MBIResourceType,
    params?:
      | Record<string, undefined | string | Array<undefined | string>>
      | Array<SavedFilter>
  ): Promise<Array<{ label: string; value: string }>> {
    if (resourceType.list_endpoint === '') {
      return [];
    }

    const urlParams = params
      ? CentreonDataSource.generateUrlSearchParamsFilters(params)
      : new URLSearchParams();

    urlParams.set('limit', this.typesLimit.toString());

    return (
      await this.call<CentreonList<{ id: string; name: string }>>({
        url: `/data-source/${
          resourceType.list_endpoint
        }?${urlParams.toString()}`
      })
    ).data.result.map(({ name }) => ({ label: name, value: name }));
    // use ID or name in the value ?
  }

  public static buildRawQuery(filters?: Array<SavedFilter>): string {
    return (filters || [])
      .filter((value) => value.type && value.filters.length > 0)
      .map(
        (value) =>
          `${value.type.value?.slug}="${value.filters
            .map((f) => f.value)
            .join('","')}"`
      )
      .join(' ');
  }

  public async buildFiltersQuery(
    rawSelector?: string
  ): Promise<Array<SavedFilter>> {
    const types = await this.getResourceList();

    return (rawSelector || '')
      ?.split(' ')
      .filter((v) => !!v)
      .map((group) => group.split('='))
      .map(([type, filters]) => {
        const currentType: SelectableValue<MBIResourceType> | undefined =
          types.find((t) => t.value?.slug === type);

        if (!currentType) {
          throw new Error(`fail to find type "${type}"`);
        }

        return {
          filters: [
            ...`,${filters}`.matchAll(
              /[=,](?:"([^"]*(?:""[^"]*)*)"|([^",\r\n]*))/gi
            )
          ].map((fullMatch) => {
            const [, m1, m2, m3] = fullMatch;
            const filter = m1 || m2 || m3;
            if (!filter) {
              throw new Error(
                `something is wrong with the current filter : ${JSON.stringify(
                  fullMatch
                )}`
              );
            }

            return {
              label: filter,
              value: filter
            };
          }),
          id: Date.now(),
          type: {
            label: type,
            value: currentType.value
          }
        };
      });
  }
}
