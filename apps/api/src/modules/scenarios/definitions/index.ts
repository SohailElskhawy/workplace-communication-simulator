import type { ScenarioDefinition } from "../scenario-definition.js";
import { behavioralInterviewV1 } from "./behavioral-interview.js";
import { difficultFeedbackV1 } from "./difficult-feedback.js";
import { managerPushbackV1 } from "./manager-pushback.js";
import { promotionRequestV1 } from "./promotion-request.js";
import { salaryNegotiationV1 } from "./salary-negotiation.js";
import { scopeCreepV1 } from "./scope-creep.js";

export const scenarioDefinitions: readonly ScenarioDefinition[] = [
  salaryNegotiationV1,
  behavioralInterviewV1,
  promotionRequestV1,
  managerPushbackV1,
  difficultFeedbackV1,
  scopeCreepV1,
];
