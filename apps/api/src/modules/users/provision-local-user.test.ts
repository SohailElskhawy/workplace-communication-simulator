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
});
