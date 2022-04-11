/**
 * MOCK ONLY USED WHEN MBI API IS NOT AVAILABLE
 * TO SIMULATE API ANSWER
 * @deprecated
 */
import express, { Router } from 'express';
import cors from 'cors';

// => file for mock only
// eslint-disable-next-line import/no-relative-packages
import { MBIResourceType } from '../../src/@types/centreonAPI';

const getRandomArbitrary = (min: number, max: number): number => Math.round(Math.random() * (max - min) + min);

const app = express();
const port = 3001;

app.use(cors({ origin: true }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const router = Router();

app.use('/centreon/api/latest', router);

router.use((req, res, next) => {
  try {
    // debug mock
    // eslint-disable-next-line no-console
    console.log(
      `${req.method} ${req.originalUrl} \n  headers : \n\t${Object.entries(req.headers)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n\t')} \n  body : \n${JSON.stringify(req.body, null, 2).split('`\n').join('\n\t')}\n\n`,
    );
  } finally {
    next();
  }
});

// mock
// eslint-disable-next-line @typescript-eslint/ban-types
const ensureAuthenticated = (req: express.Request, res: express.Response, next: Function): void => {
  const token = req.header('X-AUTH-TOKEN');
  if (token && Number(token) > Date.now()) {
    next();

    return;
  }
  res.status(401).send('UNAUTHORIZED');
};

router.post('/login', (req, res) => {
  const { body } = req;

  // fake token will be a timestamp, and so will expire when the timestamp is past
  // 30 * 60 * 1000 = 30m
  const token = Date.now() + 30 * 60 * 1000;

  if (body?.security?.credentials?.password === 'centreon') {
    res.send({
      contact: {
        alias: 'toto',
        email: 'toto@localhost',
        id: 123,
        is_admin: false,
        name: 'toto',
      },
      security: {
        token,
      },
    });
  } else {
    res.status(401).send();
  }
});

const dataSourceRouter = Router();

router.use('/data-source', dataSourceRouter);

const resourcesTypes: Array<MBIResourceType> = [
  { display_name: 'host', list_endpoint: '/centreon/api/latest/data-source/hosts', slug: 'host' },
  {
    display_name: 'host group',
    list_endpoint: '/centreon/api/latest/data-source/host-groups',
    slug: 'host-group',
  },
  {
    display_name: 'metaservice',
    list_endpoint: '/centreon/api/latest/data-source/metaservices',
    slug: 'metaservice',
  },
  { display_name: 'metric', list_endpoint: '/centreon/api/latest/data-source/metrics', slug: 'metric' },
  { display_name: 'service', list_endpoint: '/centreon/api/latest/data-source/services', slug: 'service' },
  {
    display_name: 'service group',
    list_endpoint: '/centreon/api/latest/data-source/service-groups',
    slug: 'service-group',
  },
  {
    display_name: 'virtual metric',
    list_endpoint: '/centreon/api/latest/data-source/virtual-metrics',
    slug: 'virtual-metric',
  },
];

dataSourceRouter.get('/types', ensureAuthenticated, (req, res) => {
  res.send(resourcesTypes);
});

const resourcesTypesExamples: Record<string, Array<{ [key: string]: string; name: string }>> = {
  'anomaly-detection': [
    {
      name: 'AD',
    },
  ],
  'business-activity': [
    {
      name: 'BA',
    },
  ],
  host: [
    {
      name: 'Centreon-central',
    },
  ],
  'host-group': [
    {
      name: 'HG',
    },
  ],
  metaservice: [
    {
      name: 'metaservice',
    },
  ],
  metric: [
    {
      name: 'metric',
    },
  ],
  service: [
    {
      name: 'Ping',
    },
    {
      name: 'Cpu',
    },
    {
      name: 'Memory',
    },
  ],
  'service-group': [
    {
      name: 'SG',
    },
  ],
  'virtual-metric': [
    {
      name: 'VM',
    },
  ],
};

const createEndpoint = ({ list_endpoint, slug }: MBIResourceType): void => {
  dataSourceRouter.get(`/${list_endpoint.split('/').pop()}`, ensureAuthenticated, (req: express.Request, res) => {
    const name = req.query[slug]?.toString()?.replace('*', '') || '';

    const resourcesTypesCorrespondingToRequest = resourcesTypesExamples[slug] || [];
    const result = [...new Array(getRandomArbitrary(1, 15))].map(() => {
      const id = getRandomArbitrary(1, 1500);
      const randomResource =
        resourcesTypesCorrespondingToRequest[Math.floor(Math.random() * resourcesTypesCorrespondingToRequest.length)];

      return {
        ...randomResource,
        id,
        name: `${name ? `${name}-` : ''}${randomResource.name}-${id}`,
      };
    });

    res.send({
      meta: {
        limit: 10,
        page: 1,
        search: {},
        sort_by: {},
        total: result.length,
      },
      result,
    });
  });
};

resourcesTypes.forEach((type) => {
  createEndpoint(type);
});

const metricsSample = ['response_time', 'load5', 'load10', 'load15'];

dataSourceRouter.get('/metrics/timeseries', ensureAuthenticated, (req, res) => {
  const { metrics } = req.query;

  const from = new Date(req.query.start?.toString() || Date.now() - 3 * 60 * 60 * 1000);
  const to = new Date(req.query.end?.toString() || Date.now());

  const getMetricsQuery = (): Array<string> => {
    if (!metrics) {
      return metricsSample;
    }

    return Array.isArray(metrics) ? metrics.map((m) => m.toString()) : [metrics.toString()];
  };

  const returnMetrics = getMetricsQuery();

  const result = [...new Array(getRandomArbitrary(1, returnMetrics.length))].map((unusedValue, i) => {
    const name = returnMetrics[i % returnMetrics.length];
    const id = getRandomArbitrary(1, 1500);
    const timeFrameLength = to.getTime() - from.getTime();

    const nbResults = getRandomArbitrary(10, 100);

    const step = timeFrameLength / nbResults;

    return {
      id,
      name,
      timeserie: [...new Array(nbResults)].map((_, index) => ({
        datetime: from.getTime() + index * step,
        value: getRandomArbitrary(1, 800),
      })),
      unit: '%',
    };
  });

  res.send(result);
});

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  // needed for a server
  // eslint-disable-next-line no-console
  console.log(`Example app listening on port ${port}`);
});
