import { isDeepStrictEqual } from "node:util";

import { scenarioDefinitions } from "./definitions/index.js";
import {
  ScenarioDefinitionSchema,
  type ScenarioDefinition,
} from "./scenario-definition.js";

export interface PersistedScenarioVersion {
  key: string;
  version: number;
  title: string;
  category: string;
  summary: string;
  definition: unknown;
}

export interface ScenarioSyncTransaction {
  ensureVersion(
    definition: ScenarioDefinition,
  ): Promise<PersistedScenarioVersion>;
  setActiveVersion(key: string, version: number): Promise<void>;
}

export interface ScenarioSyncStore {
  transaction(
    operation: (transaction: ScenarioSyncTransaction) => Promise<void>,
  ): Promise<void>;
}

function assertPersistedVersionMatches(
  expected: ScenarioDefinition,
  persisted: PersistedScenarioVersion,
): void {
  const persistedDefinition = ScenarioDefinitionSchema.parse(
    persisted.definition,
  );
  const metadataMatches =
    persisted.key === expected.key &&
    persisted.version === expected.version &&
    persisted.title === expected.title &&
    persisted.category === expected.category &&
    persisted.summary === expected.summary;

  if (!metadataMatches || !isDeepStrictEqual(persistedDefinition, expected)) {
    throw new Error(
      `Scenario ${expected.key} v${expected.version} differs from its persisted immutable definition. Create a new version instead.`,
    );
  }
}

export async function syncScenarioDefinitions(
  store: ScenarioSyncStore,
  definitions: readonly ScenarioDefinition[] = scenarioDefinitions,
): Promise<void> {
  const parsedDefinitions = definitions.map((definition) =>
    ScenarioDefinitionSchema.parse(definition),
  );
  const keys = new Set<string>();

  for (const definition of parsedDefinitions) {
    if (keys.has(definition.key)) {
      throw new Error(
        `Only one active definition may be synchronized for ${definition.key}.`,
      );
    }
    keys.add(definition.key);
  }

  await store.transaction(async (transaction) => {
    for (const definition of parsedDefinitions) {
      const persisted = await transaction.ensureVersion(definition);
      assertPersistedVersionMatches(definition, persisted);
    }

    for (const definition of parsedDefinitions) {
      await transaction.setActiveVersion(definition.key, definition.version);
    }
  });
}
