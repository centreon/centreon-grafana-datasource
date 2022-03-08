import express, { Router } from 'express';
import cors from 'cors';

const app = express();
const port = 3001;

app.use(cors({ origin: true }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const router = Router();

app.use('/centreon', router);

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
  if (req.header('X-AUTH-TOKEN')) {
    return next();
  } else {
    res.status(401).send('UNAUTHORIZED');
  }
}

router.get('/resource', ensureAuthenticated, (req, res) => {
  res.send([
    { value: 'hostgroup', label: 'Host Group' },
    { value: 'host', label: 'Host' },
    { value: 'service', label: 'Service' },
    { value: 'servicegroup', label: 'Service Group' },
    { value: 'metaservice', label: 'Meta Service' },
    { value: 'virtualmetric', label: 'Virtual Metric' },
    { value: 'metric', label: 'Metric' },
    { value: 'businessactivity', label: 'Business Activity' },
    { value: 'anomalydetection', label: 'Anomaly Detection' },
  ] as Array<{ value: string; label: string }>);
});

router.post('/api/latest/login', (req, res) => {
  const { body } = req;

  if (body?.security?.credentials?.password == 'toto') {
    res.send({
      contact: {
        id: 123,
        name: 'toto',
        alias: 'toto',
        email: 'toto@localhost',
        is_admin: false,
      },
      security: {
        token: 'mySuperToken',
      },
    });
  } else {
    res.status(401).send();
  }
});

app.get('/', (req, res) => {
  console.log('hello world called');
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
