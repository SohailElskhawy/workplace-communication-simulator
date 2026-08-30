import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

import { createLocalUserProvisioner } from "./provision-local-user.js";

describe("createLocalUserProvisioner", () => {
  it("creates one local user for repeated requests from the same Clerk identity", async () => {
    const storedUsers = new Map<string, { id: string }>();
    const provisioner = createLocalUserProvisioner({
      async upsert({ where, create }) {
        const existing = storedUsers.get(where.authProviderUserId);

        if (existing) {
          return existing;
        }

        const created = { id: randomUUID() };
        storedUsers.set(create.authProviderUserId, created);
        return created;
      },
    });

    const first = await provisioner.ensureUser("user_clerk_123");
    const second = await provisioner.ensureUser("user_clerk_123");

    expect(second).toEqual(first);
    expect(storedUsers.size).toBe(1);
  });

  it("keeps different Clerk identities isolated", async () => {
    const storedUsers = new Map<string, { id: string }>();
    const provisioner = createLocalUserProvisioner({
      async upsert({ where, create }) {
        const existing = storedUsers.get(where.authProviderUserId);

        if (existing) {
          return existing;
        }

        const created = { id: randomUUID() };
        storedUsers.set(create.authProviderUserId, created);
        return created;
      },
    });

    const first = await provisioner.ensureUser("user_clerk_123");
    const second = await provisioner.ensureUser("user_clerk_456");

    expect(second.id).not.toBe(first.id);
    expect(storedUsers.size).toBe(2);
  });

  it("serves from cache without calling userDelegate on repeated calls", async () => {
    let callCount = 0;
    const provisioner = createLocalUserProvisioner({
      async upsert() {
        callCount++;
        return { id: "cached_user_id" };
      },
    });

    const user1 = await provisioner.ensureUser("user_clerk_repeat");
    const user2 = await provisioner.ensureUser("user_clerk_repeat");

    expect(user1.id).toBe("cached_user_id");
    expect(user2.id).toBe("cached_user_id");
    expect(callCount).toBe(1);
  });

  it("refreshes cache when TTL expires", async () => {
    let currentTime = 1000;
    let callCount = 0;
    const provisioner = createLocalUserProvisioner(
      {
        async upsert() {
          callCount++;
          return { id: `user_id_${callCount}` };
        },
      },
      {
        ttlMs: 5000,
        clock: () => currentTime,
      },
    );

    const user1 = await provisioner.ensureUser("user_clerk_expire");
    expect(user1.id).toBe("user_id_1");
    expect(callCount).toBe(1);

    currentTime += 3000; // within TTL
    const user2 = await provisioner.ensureUser("user_clerk_expire");
    expect(user2.id).toBe("user_id_1");
    expect(callCount).toBe(1);

    currentTime += 3000; // past TTL (total +6000ms > 5000ms)
    const user3 = await provisioner.ensureUser("user_clerk_expire");
    expect(user3.id).toBe("user_id_2");
    expect(callCount).toBe(2);
  });

  it("evicts oldest entry when maxEntries is reached", async () => {
    let callCount = 0;
    const provisioner = createLocalUserProvisioner(
      {
        async upsert({ where }) {
          callCount++;
          return { id: `id_for_${where.authProviderUserId}` };
        },
      },
      {
        maxEntries: 2,
      },
    );

    await provisioner.ensureUser("user_1");
    await provisioner.ensureUser("user_2");
    expect(callCount).toBe(2);

    // adding 3rd should evict user_1
    await provisioner.ensureUser("user_3");
    expect(callCount).toBe(3);

    // user_2 should still be cached
    await provisioner.ensureUser("user_2");
    expect(callCount).toBe(3);

    // user_1 was evicted, should call upsert again
    await provisioner.ensureUser("user_1");
    expect(callCount).toBe(4);
  });
});
