import Redis from 'ioredis';

let redis = null;
function getRedisClient() {
  if (!redis && process.env.REDIS_URL) {
    redis = new Redis(process.env.REDIS_URL);
  }
  return redis;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const redisClient = getRedisClient();
  if (!redisClient) {
    return res.status(500).json({ error: 'Redis connection is not configured.' });
  }

  try {
    const keys = await redisClient.keys('aiary-*');
    if (keys.length === 0) {
      return res.status(200).json([]);
    }

    const values = await redisClient.mget(keys);
    const history = keys.map((key, index) => {
      try {
        const parsed = JSON.parse(values[index]);
        return { key, ...parsed };
      } catch {
        return { key, error: 'Failed to parse' };
      }
    });

    // Sort descending by key (aiary-YYYYMMDDHHmmss) to get latest first
    history.sort((a, b) => b.key.localeCompare(a.key));

    return res.status(200).json(history);
  } catch (error) {
    console.error('Failed to fetch history from Redis:', error);
    return res.status(500).json({ error: 'Failed to fetch history', details: error.message });
  }
}
