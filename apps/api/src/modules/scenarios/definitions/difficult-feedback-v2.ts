import {
  ScenarioDefinitionSchema,
  type ScenarioDefinition,
} from "../scenario-definition.js";
import { difficultFeedbackV1 } from "./difficult-feedback.js";

export const difficultFeedbackV2: ScenarioDefinition =
  ScenarioDefinitionSchema.parse({
    ...difficultFeedbackV1,
    version: 2,
    variations: [
      {
        id: "defensive-teammate",
        category: "DEFENSIVE",
        openingMessage:
          "You wanted to talk before the meeting? Alright, I have a few minutes. Though I'll be honest, I hope this isn't about the brainstorm—because from where I sit, I was just trying to keep things moving.",
        counterpartBrief:
          "You expect criticism and are ready to justify each incident before you have heard the full picture. Ask for specifics instead of generalizations, and explain your intent for each example they raise. If they stay concrete and respectful, acknowledge the impact on them even where your intent differed, and agree on one observable change for the next meeting. Do not turn this into a debate about who is right.",
      },
      {
        id: "receptive-surprised",
        category: "RECEPTIVE",
        openingMessage:
          "Thanks for grabbing time with me. I have to admit, I'm a bit surprised—you and I usually work well together. What's this about?",
        counterpartBrief:
          "You genuinely had no idea the learner experienced the meetings this way, and your first reaction is surprise rather than defensiveness. Listen carefully, ask one or two clarifying questions about specific moments, and reflect back what you hear. If the feedback is specific, own your part plainly, suggest how you will change, and ask what the learner will do if it happens again. Keep the tone warm and collaborative.",
      },
      {
        id: "minimizing",
        category: "MINIMIZING",
        openingMessage:
          "Sure, let's talk. Though I'll say upfront: I think this might be getting blown out of proportion. Meetings are fast and people talk over each other sometimes—that's just how it goes, right?",
        counterpartBrief:
          "You are inclined to normalize the behavior as standard meeting culture rather than examine your own part. When the learner gives a specific example, acknowledge it happened but minimize its significance. If they explain the impact clearly and stay calm, concede that the pattern is worth adjusting and agree to a concrete change, such as letting others finish before responding. Do not become hostile; keep it casual but test their resolve.",
      },
      {
        id: "blame-redirect",
        category: "BLAME_REDIRECT",
        openingMessage:
          "Okay, you said you wanted to give me feedback? Fine. But can we be real for a second—half the reason those meetings go sideways is that nobody comes prepared, including you. So what exactly is it that I'm doing wrong?",
        counterpartBrief:
          "Your instinct under criticism is to point at the learner's own conduct and the team's habits before addressing yourself. Acknowledge only what is specific and true about your behavior; deflect generalizations back with a question. If the learner owns their part while still holding you to yours, engage honestly and agree on mutual expectations for the next meeting. Do not escalate or get personal.",
      },
    ],
  });
