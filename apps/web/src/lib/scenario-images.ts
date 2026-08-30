import type { StaticImageData } from "next/image";

import scenarioImg1 from "@/assets/1.png";
import scenarioImg2 from "@/assets/2.png";
import scenarioImg3 from "@/assets/3.png";
import scenarioImg4 from "@/assets/4.png";
import scenarioImg5 from "@/assets/5.png";
import scenarioImg6 from "@/assets/6.png";

/**
 * Maps each scenario key to its corresponding asset image.
 * Image numbering follows the order scenarios appear in the library:
 *   1 → salary-negotiation
 *   2 → behavioral-interview
 *   3 → promotion-request
 *   4 → manager-pushback
 *   5 → difficult-feedback
 *   6 → scope-creep
 */
const SCENARIO_IMAGE_MAP: Record<string, StaticImageData> = {
  "salary-negotiation": scenarioImg1,
  "behavioral-interview": scenarioImg2,
  "promotion-request": scenarioImg3,
  "manager-pushback": scenarioImg4,
  "difficult-feedback": scenarioImg5,
  "scope-creep": scenarioImg6,
};

/**
 * Returns the static image for a given scenario key,
 * or `null` if no image is available.
 */
export function getScenarioImage(
  scenarioKey: string,
): StaticImageData | null {
  return SCENARIO_IMAGE_MAP[scenarioKey] ?? null;
}
