import {
  ScenarioDefinitionSchema,
  type ScenarioDefinition,
} from "../scenario-definition.js";
import { managerPushbackV1 } from "./manager-pushback.js";

export const managerPushbackV2: ScenarioDefinition =
  ScenarioDefinitionSchema.parse({
    ...managerPushbackV1,
    version: 2,
    variations: [
      {
        id: "deadline-pressure",
        category: "DEADLINE_PRESSURE",
        openingMessage:
          "Friday is locked with the client and leadership is watching this one closely. You said you have concerns about shipping—make your case, but understand that a delay is off the table unless something is truly broken.",
        counterpartBrief:
          "You are under executive pressure and a full delay is nearly off the table, but you genuinely want to avoid a client-facing failure. Listen for material risk, then steer toward scoped-down options: feature flags, a phased rollout, extra QA time before Friday, or a documented hotfix plan. If the employee offers a concrete mitigation that protects the date, back it visibly. Do not punish the disagreement.",
      },
      {
        id: "priority-disagreement",
        category: "PRIORITY_DISAGREEMENT",
        openingMessage:
          "Before we get into your concerns, let me frame the trade-off as I see it: shipping this week matters more to the client relationship than the edge cases you flagged. Convince me that the risk you're worried about outweighs that.",
        counterpartBrief:
          "You genuinely rank client trust above internal polish and believe the employee is overweighting technical risk. Ask them to quantify likelihood and impact and compare it to the cost of slipping. If they make a material-risk case with evidence, concede a targeted fix or an explicit condition for launch. Stay respectful; do not dismiss their concern as naivety.",
      },
      {
        id: "resource-constraint",
        category: "LIMITED_RESOURCES",
        openingMessage:
          "I hear that you think we're not ready, but here's my constraint: two of your teammates are out this week and there's no budget for contractors. Whatever you propose has to work with the team we actually have. What's your recommendation?",
        counterpartBrief:
          "You cannot add people or budget this week, so any plan must fit current capacity. Challenge the employee to propose options within that reality: cut scope, replace manual testing with automated checks, or stage the release. If they bring a realistic plan, adopt it and credit them. If they only restate the risk, ask what they would cut to make Friday safe.",
      },
      {
        id: "skeptical-reasoning",
        category: "SKEPTICAL_OF_REASONING",
        openingMessage:
          "I read your note twice, and honestly I'm not seeing the risk you're describing. Last quarter you flagged something similar and we shipped fine. Walk me through what's different this time.",
        counterpartBrief:
          "You doubt the risk assessment because a previous warning did not materialize, and you want to test the employee's reasoning rather than their confidence. Ask what specifically changed: new code paths, new client expectations, missing test coverage. If they distinguish this case from last quarter with specifics, take the concern seriously and agree on a verification step before Friday. Do not mock or belittle; stay firm but fair.",
      },
    ],
  });
