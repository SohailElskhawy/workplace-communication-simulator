import {
  ScenarioDefinitionSchema,
  type ScenarioDefinition,
} from "../scenario-definition.js";
import { promotionRequestV1 } from "./promotion-request.js";

export const promotionRequestV2: ScenarioDefinition =
  ScenarioDefinitionSchema.parse({
    ...promotionRequestV1,
    version: 2,
    variations: [
      {
        id: "readiness-gap",
        category: "READINESS_CONCERN",
        openingMessage:
          "I appreciate you setting this up. I'll be direct so we use the time well: I see the effort you're putting in, but I'm not yet convinced you're operating at the next level. Tell me why you believe you are.",
        counterpartBrief:
          "You believe the employee performs well at their current level but has not yet shown sustained next-level scope. Ask for examples of decisions made above their current role and how they handled ambiguity without escalating. If the evidence is credible, propose a written readiness plan with two or three concrete gaps and a review date. Do not promise a promotion.",
      },
      {
        id: "leadership-evidence",
        category: "LEADERSHIP_EVIDENCE",
        openingMessage:
          "Thanks for scheduling this. Here's where I'm coming from: promotions here require evidence of leadership beyond your own workstream, and that's the part of your case I can't piece together yet. Show me what you've got.",
        counterpartBrief:
          "Your main gap is influence on others: mentoring, cross-team impact, or leading work through people rather than doing it alone. Test whether the employee can name specific people or teams their work enabled. If they can, acknowledge it and discuss what else the promotion committee will need. If not, be honest that individual contribution alone will not carry the case this cycle.",
      },
      {
        id: "headcount-timing",
        category: "TIMING_CONSTRAINT",
        openingMessage:
          "I'm glad you brought this up now, because the timing matters: the promotion cycle for this half is already locked, and our department's one open slot is frozen by leadership. Let's talk about what we can realistically do.",
        counterpartBrief:
          "The formal cycle is closed and headcount is frozen, so an immediate promotion is not within your authority. Offer what is real: nomination for the next cycle with named criteria, a scope expansion that builds the case, and a calendar hold for the next review window. If the employee asks for the criteria in writing, agree. Do not imply the freeze is permanent and do not blame leadership.",
      },
      {
        id: "next-level-expectations",
        category: "EXPECTATION_GAP",
        openingMessage:
          "Before you make your case, I want to align on the bar: at the next level, the expectation shifts from delivering your own work to making others more effective and owning outcomes across teams. How do you see your work measuring against that today?",
        counterpartBrief:
          "You want the employee to self-assess against the next-level profile before you give your own view. Push them to name where they already operate at that level and where they do not. Acknowledge honest self-assessment. Where gaps exist, convert them into a short, measurable development plan with a follow-up date. Avoid flattery and avoid rejecting the request outright.",
      },
    ],
  });
