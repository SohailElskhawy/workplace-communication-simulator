import { describe, expect, it } from "vitest";

import { scenarioDefinitions } from "./definitions/index.js";
import { salaryNegotiationV1 } from "./definitions/salary-negotiation.js";
import type { ScenarioDefinition } from "./scenario-definition.js";
import {
  syncScenarioDefinitions,
  type PersistedScenarioVersion,
  type ScenarioSyncStore,
} from "./sync-scenarios.js";

interface StoredScenario extends PersistedScenarioVersion {
  isActive: boolean;
}

function scenarioIdentity(key: string, version: number): string {
  return `${key}:${version}`;
}

function createMemoryStore(initial: StoredScenario[] = []): {
  records: Map<string, StoredScenario>;
  store: ScenarioSyncStore;
} {
  const records = new Map(
    initial.map((scenario) => [
      scenarioIdentity(scenario.key, scenario.version),
      structuredClone(scenario),
    ]),
  );

  return {
    records,
    store: {
      async transaction(operation) {
        const transactionRecords = structuredClone(records);

        await operation({
          async ensureVersion(definition) {
            const identity = scenarioIdentity(
              definition.key,
              definition.version,
            );
            const existing = transactionRecords.get(identity);

            if (existing) {
              return existing;
            }

            const created: StoredScenario = {
              key: definition.key,
              version: definition.version,
              title: definition.title,
              category: definition.category,
              summary: definition.summary,
              definition: structuredClone(definition),
              isActive: false,
            };
            transactionRecords.set(identity, created);
            return created;
          },
          async setActiveVersion(key, version) {
            for (const scenario of transactionRecords.values()) {
              if (scenario.key === key) {
                scenario.isActive = scenario.version === version;
              }
            }
          },
        });

        records.clear();
        for (const [identity, scenario] of transactionRecords) {
          records.set(identity, scenario);
        }
      },
    },
  };
}

describe("syncScenarioDefinitions", () => {
  it("persists and activates all six Release 1 definitions idempotently", async () => {
    const { records, store } = createMemoryStore();

    await syncScenarioDefinitions(store);
    await syncScenarioDefinitions(store);

    expect(records.size).toBe(6);
    for (const definition of scenarioDefinitions) {
      expect(records.get(scenarioIdentity(definition.key, 1))).toMatchObject({
        key: definition.key,
        version: 1,
        isActive: true,
      });
    }
  });

  it("persists and activates Salary Negotiation v1 idempotently", async () => {
    const { records, store } = createMemoryStore();

    await syncScenarioDefinitions(store, [salaryNegotiationV1]);
    await syncScenarioDefinitions(store, [salaryNegotiationV1]);

    expect(records.size).toBe(1);
    expect(records.get("salary-negotiation:1")).toMatchObject({
      key: "salary-negotiation",
      version: 1,
      isActive: true,
    });
  });

  it("activates a new version without modifying the historical version", async () => {
    const { records, store } = createMemoryStore();
    await syncScenarioDefinitions(store, [salaryNegotiationV1]);
    const versionTwo: ScenarioDefinition = {
      ...salaryNegotiationV1,
      version: 2,
      title: "Salary Negotiation v2",
    };

    await syncScenarioDefinitions(store, [versionTwo]);

    expect(records.get("salary-negotiation:1")?.isActive).toBe(false);
    expect(records.get("salary-negotiation:1")?.definition).toEqual(
      salaryNegotiationV1,
    );
    expect(records.get("salary-negotiation:2")?.isActive).toBe(true);
  });

  it("rejects definition drift and rolls back activation changes", async () => {
    const drifted = structuredClone(salaryNegotiationV1);
    drifted.aiObjective = "Changed in place";
    const { records, store } = createMemoryStore([
      {
        key: drifted.key,
        version: drifted.version,
        title: drifted.title,
        category: drifted.category,
        summary: drifted.summary,
        definition: drifted,
        isActive: false,
      },
    ]);

    await expect(
      syncScenarioDefinitions(store, [salaryNegotiationV1]),
    ).rejects.toThrow("immutable definition");
    expect(records.get("salary-negotiation:1")?.isActive).toBe(false);
    expect(
      (records.get("salary-negotiation:1")?.definition as ScenarioDefinition)
        .aiObjective,
    ).toBe("Changed in place");
  });
});
