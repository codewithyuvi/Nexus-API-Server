import Redis from "ioredis";

if (!process.env.REDIS_URL) {
  throw new Error("CRITICAL ERROR: REDIS_URL environment variable is missing in Render!");
}

export const redisConnection = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
});