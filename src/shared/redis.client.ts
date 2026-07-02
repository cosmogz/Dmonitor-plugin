import { createClient, RedisClientType } from 'redis';
import { config } from '../config/app.config';

let client: RedisClientType | null = null;

export async function getRedisClient(): Promise<RedisClientType | null> {
  if (!config.redisUrl) return null;
  if (client) return client;

  // support a mock redis for tests via a special URL scheme mock://
  if (config.redisUrl.startsWith('mock:')) {
    const store = new Map<string, any>();
    const mockClient: any = {
      on: () => {},
      connect: async () => {},
      disconnect: async () => {},
      exists: async (k: string) => (store.has(k) ? 1 : 0),
      incr: async (k: string) => {
        const v = Number(store.get(k) || 0) + 1;
        store.set(k, v.toString());
        return v;
      },
      expire: async (k: string, ttl: number) => {
        // not implementing TTL in mock
        return 1;
      },
      set: async (k: string, v: any, opts?: any) => {
        store.set(k, v);
        return 'OK';
      },
      del: async (k: string) => {
        return store.delete(k) ? 1 : 0;
      },
    };
    // @ts-ignore
    client = mockClient;
    return client;
  }

  client = createClient({ url: config.redisUrl });
  client.on('error', (err) => {
    // eslint-disable-next-line no-console
    console.error('Redis client error', err);
  });
  await client.connect();
  return client;
}

export async function disconnectRedis() {
  if (client) await client.disconnect();
  client = null;
}
