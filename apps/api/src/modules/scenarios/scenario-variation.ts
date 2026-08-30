import type {
  ScenarioDefinition,
  ScenarioVariation,
} from "./scenario-definition.js";

export interface SelectScenarioVariationOptions {
  /**
   * Variation id to exclude from selection, e.g. the retry source's variation,
   * so a retry uses a different variation whenever the pool allows.
   */
  excludeVariationId?: string | null;
  /**
   * Injected for deterministic tests; defaults to Math.random.
   */
  random?: () => number;
}

/**
 * Selects the variation for a new attempt from the definition's curated pool.
 *
 * - no variations → null (base scenario behavior, backward compatible);
 * - pool of 1 → that variation, even when it matches the excluded id;
 * - otherwise → uniform random pick from the pool minus the excluded id.
 */
export function selectScenarioVariation(
  definition: ScenarioDefinition,
  options: SelectScenarioVariationOptions = {},
): ScenarioVariation | null {
  const variations = definition.variations ?? [];
  if (variations.length === 0) {
    return null;
  }

  const excludeVariationId = options.excludeVariationId;
  const pool =
    excludeVariationId != null && variations.length > 1
      ? variations.filter((variation) => variation.id !== excludeVariationId)
      : variations;

  const random = options.random ?? Math.random;
  const index = Math.min(pool.length - 1, Math.floor(random() * pool.length));
  return pool[index] ?? null;
}

/**
 * Resolves the variation stored on an attempt. Unknown or missing ids
 * (e.g. attempts created before variations existed) fall back to null so
 * callers use the base definition.
 */
export function resolveScenarioVariation(
  definition: ScenarioDefinition,
  variationId: string | null | undefined,
): ScenarioVariation | null {
  if (!variationId) {
    return null;
  }
  return (
    definition.variations?.find((variation) => variation.id === variationId) ??
    null
  );
}
