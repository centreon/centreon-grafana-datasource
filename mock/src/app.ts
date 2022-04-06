/**
 * MOCK ONLY USED WHEN MBI API IS NOT AVAILABLE
 * TO SIMULATE API ANSWER
 */
import express, { Router } from 'express';
import cors from 'cors';
import { MBIResourceType } from '../../src/@types/centreonAPI';

function getRandomArbitrary(min: number, max: number) {
  return Math.round(Math.random() * (max - min) + min);
}

const app = express();
const port = 3001;

app.use(cors({ origin: true }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const router = Router();

app.use('/centreon/api/latest', router);

router.use((req, res, next) => {
  try {
    console.log(
      `${req.method} ${req.originalUrl} \n  headers : \n\t${Object.entries(req.headers)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n\t')} \n  body : \n${JSON.stringify(req.body, null, 2).split('`\n').join('\n\t')}\n\n`
    );
  } finally {
    next();
  }
});

function ensureAuthenticated(req: express.Request, res: express.Response, next: Function) {
  const token = req.header('X-AUTH-TOKEN');
  if (token && Number(token) > Date.now()) {
    return next();
  }
  res.status(401).send('UNAUTHORIZED');
}

router.post('/login', (req, res) => {
  const { body } = req;

  //fake token will be a timestamp, and so will expire when the timestamp is past
  // 30 * 60 * 1000 = 30m
  const token = Date.now() + 30 * 60 * 1000;

  if (body?.security?.credentials?.password === 'centreon') {
    res.send({
      contact: {
        id: 123,
        name: 'toto',
        alias: 'toto',
        email: 'toto@localhost',
        is_admin: false,
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

const resourcesTypes: MBIResourceType[] = [
  { slug: 'host', display_name: 'host', list_endpoint: '/centreon/api/latest/data-source/hosts' },
  {
    slug: 'host-group',
    display_name: 'host group',
    list_endpoint: '/centreon/api/latest/data-source/host-groups',
  },
  {
    slug: 'metaservice',
    display_name: 'metaservice',
    list_endpoint: '/centreon/api/latest/data-source/metaservices',
  },
  { slug: 'metric', display_name: 'metric', list_endpoint: '/centreon/api/latest/data-source/metrics' },
  { slug: 'service', display_name: 'service', list_endpoint: '/centreon/api/latest/data-source/services' },
  {
    slug: 'service-group',
    display_name: 'service group',
    list_endpoint: '/centreon/api/latest/data-source/service-groups',
  },
  {
    slug: 'virtual-metric',
    display_name: 'virtual metric',
    list_endpoint: '/centreon/api/latest/data-source/virtual-metrics',
  },
];

dataSourceRouter.get('/types', ensureAuthenticated, (req, res) => {
  res.send(resourcesTypes);
});

const resourcesTypesExamples: Record<string, Array<{ name: string; [key: string]: string }>> = {
  host: [
    {
      name: 'Centreon-central',
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
  ['host-group']: [
    {
      name: 'HG',
    },
  ],
  ['service-group']: [
    {
      name: 'SG',
    },
  ],
  ['virtual-metric']: [
    {
      name: 'VM',
    },
  ],
  ['business-activity']: [
    {
      name: 'BA',
    },
  ],
  ['anomaly-detection']: [
    {
      name: 'AD',
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
};

const createEndpoint = ({ list_endpoint, slug }: MBIResourceType) => {
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
        name: `${name ? name + '-' : ''}${randomResource.name}-${id}`,
      };
    });

    res.send({
      result: result,
      meta: {
        page: 1,
        limit: 10,
        search: {},
        sort_by: {},
        total: result.length,
      },
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

  let returnMetrics = metrics
    ? Array.isArray(metrics)
      ? metrics.map((m) => m.toString())
      : [metrics.toString()]
    : metricsSample;

  const result = [...new Array(getRandomArbitrary(1, returnMetrics.length))].map((_, i) => {
    const name = returnMetrics[i % returnMetrics.length];
    const id = getRandomArbitrary(1, 1500);
    const timeFrameLength = to.getTime() - from.getTime();

    const nbResults = getRandomArbitrary(10, 100);

    const step = timeFrameLength / nbResults;

    return {
      id,
      name,
      unit: '%',
      timeserie: [...new Array(nbResults)].map((_, index) => ({
        value: getRandomArbitrary(1, 800),
        datetime: from.getTime() + index * step,
      })),
    };
  });

  res.send({
    result: result,
    meta: {
      page: 1,
      limit: 10,
      search: {},
      sort_by: {},
      total: result.length,
    },
  });
});

app.get('/', (req, res) => {
  console.log('hello world called');
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
