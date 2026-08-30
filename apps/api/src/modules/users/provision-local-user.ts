export interface LocalUser {
  id: string;
}

interface UserUpsertDelegate {
  upsert(args: {
    where: { authProviderUserId: string };
    create: { authProviderUserId: string };
    update: Record<string, never>;
    select: { id: true };
  }): Promise<LocalUser>;
}

export interface LocalUserProvisioner {
  ensureUser(authProviderUserId: string): Promise<LocalUser>;
}

export interface LocalUserProvisionerOptions {
  ttlMs?: number;
  maxEntries?: number;
  clock?: () => number;
}

const DEFAULT_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const DEFAULT_MAX_CACHE_ENTRIES = 10_000;

export function createLocalUserProvisioner(
  userDelegate: UserUpsertDelegate,
  options: LocalUserProvisionerOptions = {},
): LocalUserProvisioner {
  const ttlMs = options.ttlMs ?? DEFAULT_CACHE_TTL_MS;
  const maxEntries = options.maxEntries ?? DEFAULT_MAX_CACHE_ENTRIES;
  const clock = options.clock ?? Date.now;
  const cache = new Map<string, { user: LocalUser; expiresAt: number }>();

  return {
    async ensureUser(authProviderUserId: string) {
      const now = clock();
      const cached = cache.get(authProviderUserId);
      if (cached && now < cached.expiresAt) {
        return cached.user;
      }

      const user = await userDelegate.upsert({
        where: { authProviderUserId },
        create: { authProviderUserId },
        update: {},
        select: { id: true },
      });

      if (cache.size >= maxEntries) {
        const oldestKey = cache.keys().next().value;
        if (oldestKey !== undefined) {
          cache.delete(oldestKey);
        }
      }

      cache.set(authProviderUserId, {
        user,
        expiresAt: now + ttlMs,
      });

      return user;
    },
  };
}
