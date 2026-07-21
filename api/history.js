import Redis from 'ioredis';
import { supabase } from './_lib/supabase.js';

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
    // Verify Supabase Auth Session Token from Authorization Header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing token' });
    }
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token', details: authError?.message });
    }
    const userId = user.id;

    const cleanUserId = (userId || 'anonymous').replace(/[^a-zA-Z0-9_-]/g, '');
    // 해당 유저의 ID로 시작하는 키 목록만 선별적으로 검색 (와일드카드 * 사용)
    const keys = await redisClient.keys(`user:${cleanUserId}:diary-*`);
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
