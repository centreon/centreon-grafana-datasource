import express, { Router } from 'express';
import cors from 'cors';

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
  } else {
    res.status(401).send('UNAUTHORIZED');
  }
}

router.post('/login', (req, res) => {
  const { body } = req;

  if (body?.security?.credentials?.password == 'toto') {
    // token valid 30 minutes to test
    res.send({
      contact: {
        id: 123,
        name: 'toto',
        alias: 'toto',
        email: 'toto@localhost',
        is_admin: false,
      },
      security: {
        token: Date.now() + 30 * 60 * 1000,
      },
    });
  } else {
    res.status(401).send();
  }
});

const dataSourceRouter = Router();

router.use('/data-source', dataSourceRouter);

interface IResource {
  display_name: string;
  slug: string;
  endpoint: string;
}

const resourcesTypes: Array<IResource> = [
  {
    endpoint: '/api/latest/data-source/host',
    slug: 'host',
    display_name: 'Host',
  },
  {
    endpoint: '/api/latest/data-source/service',
    slug: 'service',
    display_name: 'Service',
  },
  {
    endpoint: '/api/latest/data-source/host-group',
    slug: 'host-group',
    display_name: 'host group',
  },
  {
    endpoint: '/api/latest/data-source/service-group',
    slug: 'service-group',
    display_name: 'Service group',
  },
  {
    endpoint: '/api/latest/data-source/metaservice',
    slug: 'metaservice',
    display_name: 'Meta Service',
  },
  {
    endpoint: '/api/latest/data-source/metric',
    slug: 'metric',
    display_name: 'Metric',
  },
  {
    endpoint: '/api/latest/data-source/virtual-metric',
    slug: 'virtual-metric',
    display_name: 'Virtual Metric',
  },
  {
    endpoint: '/api/latest/data-source/business-activity',
    slug: 'business-activity',
    display_name: 'Business Activity',
  },
  {
    endpoint: '/api/latest/data-source/anomaly-detection',
    slug: 'anomaly-detection',
    display_name: 'Anomaly Detection Service',
  },
];
dataSourceRouter.get('/types', ensureAuthenticated, (req, res) => {
  res.send({
    result: resourcesTypes,
    meta: {
      page: 1,
      limit: 10,
      search: {},
      sort_by: {},
      total: 1,
    },
  });
});

const typeRet: Record<string, Array<{ name: string; [key: string]: string }>> = {
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

const createEndpoint = ({ endpoint, slug }: IResource) => {
  dataSourceRouter.get(`/${endpoint.split('/').pop()}`, ensureAuthenticated, (req: express.Request, res) => {
    const name = req.query[slug]?.toString()?.replace('*', '') || '';

    const retTypes = typeRet[slug] || [];
    const result = [...new Array(getRandomArbitrary(1, 15))].map(() => {
      const id = getRandomArbitrary(1, 1500);
      const randRet = retTypes[Math.floor(Math.random() * retTypes.length)];
      return {
        ...randRet,
        id,
        name: `${name ? name + '-' : ''}${randRet.name}-${id}`,
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
  const { metrics } = req.params;
  console.log(metrics);

  const from = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const to = new Date();
  // const step = 5 * 1000;

  let returnMetrics: Array<string>;
  if (metrics) {
    returnMetrics = Array.isArray(metrics) ? metrics : [metrics];
  } else {
    returnMetrics = metricsSample;
  }

  const result = [...new Array(getRandomArbitrary(1, returnMetrics.length))].map((_, i) => {
    const name = returnMetrics[i % returnMetrics.length];
    const id = getRandomArbitrary(1, 1500);
    const step = getRandomArbitrary(100, 200) * 1000;

    return {
      id,
      name,
      unit: '%',
      timeserie: [...new Array(Math.floor((to.getTime() - from.getTime()) / step))].map((_, index) => ({
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
