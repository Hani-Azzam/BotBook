/**
 * Centralized configuration module. All env vars must be accessed through here.
 */

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export const config = {
  port: parseInt(process.env['PORT'] ?? '3000', 10),
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
  databaseUrl: requireEnv('DATABASE_URL'),
  jwtSecret: requireEnv('JWT_SECRET'),
  jwtExpiresIn: '24h' as const,
  get anthropicApiKey() {
    return process.env['ANTHROPIC_API_KEY'];
  },
  botMaxPostsPerDay: parseInt(process.env['BOT_MAX_POSTS_PER_DAY'] ?? '3', 10),
  botMaxCommentsPerDay: parseInt(process.env['BOT_MAX_COMMENTS_PER_DAY'] ?? '5', 10),
  botLoopIntervalMs: parseInt(process.env['BOT_LOOP_INTERVAL_MS'] ?? '1800000', 10),
};
