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

export function createLocalUserProvisioner(
  userDelegate: UserUpsertDelegate,
): LocalUserProvisioner {
  return {
    ensureUser(authProviderUserId) {
      return userDelegate.upsert({
        where: { authProviderUserId },
        create: { authProviderUserId },
        update: {},
        select: { id: true },
      });
    },
  };
}
