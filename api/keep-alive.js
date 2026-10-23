import Redis from 'ioredis';
import { supabase } from './_lib/supabase.js';

let redis = null;
function getRedisClient() {
  const redisUrl = process.env.REDIS_URL || process.env.REDIS_URL_REDIS_URL;
  if (!redis && redisUrl) {
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      connectTimeout: 5000
    });
  }
  return redis;
}

export default async function handler(req, res) {
  // Prevent any caching so each invocation hits the actual databases
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const startTime = Date.now();
  const results = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    services: {}
  };

  // 1. Supabase Health Check & Activity Trigger
  try {
    const supaStart = Date.now();
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true });

    if (error) {
      results.services.supabase = {
        status: 'warning',
        error: error.message,
        latencyMs: Date.now() - supaStart
      };
    } else {
      results.services.supabase = {
        status: 'ok',
        messageCount: count,
        latencyMs: Date.now() - supaStart
      };
    }
  } catch (supaErr) {
    results.services.supabase = {
      status: 'error',
      error: supaErr.message
    };
  }

  // 2. Redis Health Check & Activity Trigger
  try {
    const redisStart = Date.now();
    const redisClient = getRedisClient();
    if (!redisClient) {
      results.services.redis = {
        status: 'skipped',
        message: 'Redis URL not configured'
      };
    } else {
      const pong = await redisClient.ping();
      results.services.redis = {
        status: 'ok',
        response: pong,
        latencyMs: Date.now() - redisStart
      };
    }
  } catch (redisErr) {
    results.services.redis = {
      status: 'error',
      error: redisErr.message
    };
  }

  results.totalDurationMs = Date.now() - startTime;

  return res.status(200).json(results);
}
