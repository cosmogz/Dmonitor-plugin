import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { json } from 'body-parser';
import { routes } from './shared/routes';
import { authMiddleware } from './shared/auth.middleware';
import { initDatabase } from './shared/db';
import { versionInfo } from './config/version';
import { metricsHandler, observeRequestDuration } from './metrics/metrics';
import { rateLimiter } from './shared/rateLimiter';

dotenv.config();

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

app.use(helmet());
app.use(cors());
app.use(json());
app.use(morgan('combined'));

// Apply a basic IP rate limiter early in the middleware chain
app.use(rateLimiter);

app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    const routePath = req.route?.path ? `${req.baseUrl}${req.route.path}` : req.baseUrl || req.path;
    observeRequestDuration(req.method, routePath || req.path, res.statusCode, durationMs);
  });
  next();
});

app.get('/', (_req, res) => res.json({ status: 'Dmonitor service is running', version: versionInfo }));
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/version', (_req, res) => res.json({ version: versionInfo }));
app.use('/api/v1', authMiddleware, routes);
// metrics endpoint (Prometheus)
app.get('/metrics', async (_req, res) => {
  try {
    const body = await metricsHandler();
    res.set('Content-Type', 'text/plain; version=0.0.4');
    res.send(body);
  } catch (err) {
    res.status(500).send('metrics error');
  }
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

async function start() {
  if (process.env.DATABASE_URL) {
    await initDatabase();
  }

  app.listen(port, () => {
    console.log(`Dmonitor service listening on http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error('Startup failed:', error);
  process.exit(1);
});
