import type { ScenarioDefinition } from "../scenario-definition.js";
import { behavioralInterviewV2 } from "./behavioral-interview-v2.js";
import { difficultFeedbackV2 } from "./difficult-feedback-v2.js";
import { managerPushbackV2 } from "./manager-pushback-v2.js";
import { promotionRequestV2 } from "./promotion-request-v2.js";
import { salaryNegotiationV2 } from "./salary-negotiation-v2.js";
import { scopeCreepV2 } from "./scope-creep-v2.js";

export const scenarioDefinitions: readonly ScenarioDefinition[] = [
  salaryNegotiationV2,
  behavioralInterviewV2,
  promotionRequestV2,
  managerPushbackV2,
  difficultFeedbackV2,
  scopeCreepV2,
];
