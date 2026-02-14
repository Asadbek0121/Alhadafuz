
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Initialize Upstash Redis for Rate Limiting
// These ENV vars should be set in Vercel/Production
export const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || "",
    token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

// Create a new ratelimiter, that allows 10 requests per 10 seconds
export const ratelimit = new Ratelimit({
    redis: redis,
    limiter: Ratelimit.slidingWindow(10, "10 s"),
    analytics: true,
    prefix: "@upstash/ratelimit",
});

/**
 * Higher-order function to wrap API handlers with rate limiting
 */
export async function checkRateLimit(identifier: string) {
    if (!process.env.UPSTASH_REDIS_REST_URL) {
        return { success: true, limit: 0, remaining: 0, reset: 0 };
    }
    return await ratelimit.limit(identifier);
}
