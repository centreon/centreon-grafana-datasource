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

dataSourceRouter.get('/types', ensureAuthenticated, (req, res) => {
  res.send({
    result: [
      'host',
      'service',
      'host_group',
      'service_group',
      'metaservice',
      'virtual_metric',
      'businessactivity',
      'anomalydetection',
    ],
    meta: {
      page: 1,
      limit: 10,
      search: {},
      sort_by: {},
      total: 1,
    },
  });
});

dataSourceRouter.get('/host', ensureAuthenticated, (req: express.Request, res) => {
  const { search } = req.query;

  const result = [...new Array(getRandomArbitrary(1, 15))].map(() => {
    const id = getRandomArbitrary(1, 1500);
    return {
      id,
      name: `${search?.toString()}-Centreon-Central-${id}`,
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

dataSourceRouter.get('/service', ensureAuthenticated, (req: express.Request, res) => {
  const { search } = req.query;

  const result = [...new Array(getRandomArbitrary(1, 15))].map(() => {
    const host_id = getRandomArbitrary(1, 1500);
    const id = getRandomArbitrary(1, 1500);
    return {
      host_id,
      host_name: `${search?.toString()}-Centreon-Central-${host_id}`,
      id,
      name: `Ping-${id}`,
    };
  });

  res.send({
    result,
    meta: {
      page: 1,
      limit: 10,
      search: {},
      sort_by: {},
      total: result.length,
    },
  });
});

dataSourceRouter.get('/host_group', ensureAuthenticated, (req: express.Request, res) => {
  const { search } = req.query;

  const result = [...new Array(getRandomArbitrary(1, 15))].map(() => {
    const id = getRandomArbitrary(1, 1500);
    return {
      id,
      name: `${search?.toString()}-HG-${id}`,
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

dataSourceRouter.get('/service_group', ensureAuthenticated, (req: express.Request, res) => {
  const { search } = req.query;

  const result = [...new Array(getRandomArbitrary(1, 15))].map(() => {
    const id = getRandomArbitrary(1, 1500);
    return {
      id,
      name: `${search?.toString()}-SG-${id}`,
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

dataSourceRouter.get('/metaservice', ensureAuthenticated, (req: express.Request, res) => {
  const { search } = req.query;

  const result = [...new Array(getRandomArbitrary(1, 15))].map(() => {
    const id = getRandomArbitrary(1, 1500);
    return {
      id,
      name: `${search?.toString()}-META-${id}`,
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

dataSourceRouter.get('/virtual_metric', ensureAuthenticated, (req: express.Request, res) => {
  const { search } = req.query;

  const result = [...new Array(getRandomArbitrary(1, 15))].map(() => {
    const id = getRandomArbitrary(1, 1500);
    return {
      id,
      name: `${search?.toString()}-virtual-${id}`,
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

dataSourceRouter.get('/businessactivity', ensureAuthenticated, (req: express.Request, res) => {
  const { search } = req.query;

  const result = [...new Array(getRandomArbitrary(1, 15))].map(() => {
    const id = getRandomArbitrary(1, 1500);
    return {
      id,
      name: `${search?.toString()}-business-activity-${id}`,
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

dataSourceRouter.get('/anomalydetection', ensureAuthenticated, (req: express.Request, res) => {
  const { search } = req.query;

  const result = [...new Array(getRandomArbitrary(1, 15))].map(() => {
    const id = getRandomArbitrary(1, 1500);
    return {
      id,
      name: `${search?.toString()}-Anomaly1-${id}`,
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
