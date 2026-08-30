import {
  ScenarioDefinitionSchema,
  type ScenarioDefinition,
} from "../scenario-definition.js";
import { salaryNegotiationV1 } from "./salary-negotiation.js";

export const salaryNegotiationV2: ScenarioDefinition =
  ScenarioDefinitionSchema.parse({
    ...salaryNegotiationV1,
    version: 2,
    variations: [
      {
        id: "budget-cap",
        category: "BUDGET_CONSTRAINT",
        openingMessage:
          "Thanks for making time. I want to be upfront before you make your case: the band for this role was approved near the top of our range, and the offer is already close to it. I'm still happy to hear what you had in mind.",
        counterpartBrief:
          "The compensation band is nearly exhausted and any meaningful increase requires VP approval that you do not have on this call. Steer the candidate toward total-package value such as a signing bonus, an early review commitment, or title scope rather than base salary. If the candidate presents strong, specific evidence, agree to take a concrete written request to compensation review with a named owner and date. Never invent benefits or approve numbers during the call.",
      },
      {
        id: "performance-evidence",
        category: "PERFORMANCE_EVIDENCE",
        openingMessage:
          "I'm glad we're talking about the offer. Before we get into numbers, help me understand: what makes you confident you'll perform at a level that justifies more than we've offered?",
        counterpartBrief:
          "You respect evidence but hear many unsupported claims from candidates. Ask for one or two concrete examples of comparable impact and probe what was personally theirs rather than the team's. If the evidence is specific and relevant, acknowledge it and explore a modest adjustment or an early performance review. If the claims stay vague, say plainly that you cannot take an unsupported case to compensation. Never fabricate a counteroffer.",
      },
      {
        id: "review-cycle",
        category: "TIMING_CONSTRAINT",
        openingMessage:
          "Good timing on this call, though I should mention: our compensation review cycle closed last week and the next one is six months out. That doesn't make this conversation pointless—what outcome would be most useful for you today?",
        counterpartBrief:
          "Formal adjustments are locked until the next review cycle and reopening the band now would create equity problems with recent hires. Redirect toward what is genuinely possible now: a documented early-review commitment with written criteria, a signing bonus, or a title adjustment. If the candidate proposes a concrete written follow-up, agree to it and confirm the date. Do not promise an out-of-cycle raise.",
      },
      {
        id: "market-challenge",
        category: "MARKET_CHALLENGE",
        openingMessage:
          "I understand you want to discuss the package. I'll be honest with you: we benchmarked this role against market data recently and we believe the offer is competitive. Walk me through what's driving your view that it isn't.",
        counterpartBrief:
          "You are skeptical of market claims because candidates often cite unverified numbers. Ask where their data comes from and how they scoped the role when comparing. If they cite a credible, specific source, engage seriously and offer to re-benchmark with a named owner and a date. If the claim rests on vague figures or an unverified competing offer, weigh it but require specifics before committing to anything.",
      },
    ],
  });
