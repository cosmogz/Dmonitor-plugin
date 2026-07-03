process.env.RATE_LIMIT_PER_WINDOW = '2';
process.env.RATE_LIMIT_WINDOW_MS = String(60 * 1000);

describe('rateLimiter middleware (in-memory)', () => {
  let rateLimiter: any;
  let _resetRateLimiterStore: () => void;

  beforeEach(() => {
    // Ensure redis is not configured for this scenario
    delete process.env.REDIS_URL;
    jest.resetModules();
    // eslint-disable-next-line global-require
    const mod = require('../shared/rateLimiter');
    rateLimiter = mod.rateLimiter;
    _resetRateLimiterStore = mod._resetRateLimiterStore;
    _resetRateLimiterStore();
  });

  it('allows requests up to the limit then blocks', async () => {
    const req: any = { ip: '1.2.3.4', headers: {}, path: '/' };
    const res: any = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();

    // middleware is async
    await rateLimiter(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);

    await rateLimiter(req, res, next);
    expect(next).toHaveBeenCalledTimes(2);

    await rateLimiter(req, res, next);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({ error: 'Too many requests' });
  });
});

describe('rateLimiter middleware (redis persistence + per-route overrides)', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('uses redis to persist counts and respects per-route overrides', async () => {
    process.env.REDIS_URL = 'mock:';
    // eslint-disable-next-line global-require
    const mod = require('../shared/rateLimiter');
    const { createRateLimiter } = mod;

    const overrides = { '/special': { maxRequests: 1, windowMs: 60 * 1000 } };
    const rl = createRateLimiter(overrides);

    const reqNormal: any = { ip: '9.9.9.9', headers: {}, path: '/' };
    const resNormal: any = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const nextNormal = jest.fn();

    // normal path uses default limit (2)
    await rl(reqNormal, resNormal, nextNormal);
    await rl(reqNormal, resNormal, nextNormal);
    expect(nextNormal).toHaveBeenCalledTimes(2);

    // special path has maxRequests 1
    const reqSpec: any = { ip: '9.9.9.9', headers: {}, path: '/special' };
    const resSpec: any = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const nextSpec = jest.fn();

    await rl(reqSpec, resSpec, nextSpec);
    expect(nextSpec).toHaveBeenCalledTimes(1);

    await rl(reqSpec, resSpec, nextSpec);
    expect(resSpec.status).toHaveBeenCalledWith(429);
    expect(resSpec.json).toHaveBeenCalledWith({ error: 'Too many requests' });
  });
});
