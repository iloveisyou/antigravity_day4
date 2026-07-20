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
    const { userId } = req.query;
    // 현재 로그인된 유저의 ID가 '516e586d-...' 일 때
    const cleanUserId = (userId || 'anonymous').replace(/[^a-zA-Z0-9_-]/g, '');
    // 해당 유저의 ID로 시작하는 키 목록만 선별적으로 검색 (와일드카드 * 사용)
    const keys = await redisClient.keys(`aiary-${cleanUserId}-*`);
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
