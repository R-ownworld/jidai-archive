import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

/**
 * 管理者キーを検証する
 * Redisに override-key があればそちらを優先、なければ環境変数のADMIN_KEYを使用
 */
export async function verifyAdminKey(key: string): Promise<boolean> {
  if (!key) return false;
  const overrideKey = await redis.get<string>('admin:override-key');
  const validKey = overrideKey || process.env.ADMIN_KEY;
  return key === validKey;
}
