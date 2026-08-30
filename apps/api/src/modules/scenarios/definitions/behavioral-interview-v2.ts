import {
  ScenarioDefinitionSchema,
  type ScenarioDefinition,
} from "../scenario-definition.js";
import { behavioralInterviewV1 } from "./behavioral-interview.js";

export const behavioralInterviewV2: ScenarioDefinition =
  ScenarioDefinitionSchema.parse({
    ...behavioralInterviewV1,
    version: 2,
    variations: [
      {
        id: "introduction-to-impact",
        category: "EARLY_CAREER",
        openingMessage:
          "Thanks for joining me today. To start, tell me a bit about yourself and the kind of work you enjoy most.",
        counterpartBrief:
          "You have limited interview time and want specific, job-relevant evidence. Ask one focused follow-up at a time: probe what the candidate personally did, separate their contribution from the team's, and ask how the outcome was measured. If an answer stays generic, ask for one concrete example. Keep a friendly, curious tone and move on once you have what you need.",
        interviewTrack: {
          questions: [
            {
              category: "INTRODUCTION",
              question:
                "Thanks for joining me today. To start, tell me a bit about yourself and the kind of work you enjoy most.",
            },
            {
              category: "EXPERIENCE",
              question:
                "Tell me about a project you're proud of. What was your role in it?",
            },
            {
              category: "TEAMWORK_CONFLICT",
              question:
                "Tell me about a time you and a teammate disagreed about how to approach a piece of work. What did you do?",
            },
            {
              category: "REFLECTION",
              question:
                "Looking back on that experience, what would you do differently?",
            },
          ],
        },
      },
      {
        id: "ownership-and-initiative",
        category: "OWNERSHIP_FOCUS",
        openingMessage:
          "Let's dive in. Walk me through a project you owned from start to finish—what was it, and what did owning it involve?",
        counterpartBrief:
          "Probe how the candidate makes decisions under ambiguity and what was personally theirs versus the team's work. Ask what obstacles appeared and how they unblocked them, and what they would scope differently with hindsight. Stay neutral and time-conscious; do not coach the candidate toward better answers.",
        interviewTrack: {
          questions: [
            {
              category: "EXPERIENCE",
              question:
                "Let's dive in. Walk me through a project you owned from start to finish—what was it, and what did owning it involve?",
            },
            {
              category: "OWNERSHIP",
              question:
                "Tell me about a time you stepped up for something outside your job description. Why did you, and what happened?",
            },
            {
              category: "PROBLEM_SOLVING",
              question:
                "Describe a problem you had to solve where the requirements or the cause weren't clear at first.",
            },
            {
              category: "ADAPTABILITY",
              question:
                "Tell me about a time priorities shifted in the middle of your work. How did you adjust?",
            },
          ],
        },
      },
      {
        id: "learning-from-setbacks",
        category: "RESILIENCE",
        openingMessage:
          "I'd like to start with something a bit harder: tell me about a professional setback or mistake that was at least partly yours. What happened, and what did you learn?",
        counterpartBrief:
          "Encourage honest accountability. If the candidate blames circumstances or other people entirely, ask what part was within their control. Probe what specifically changed in their behavior afterward, not just what they felt. Remain supportive but evidence-focused, and accept a genuine lesson over a polished non-answer.",
        interviewTrack: {
          questions: [
            {
              category: "FAILURE_LEARNING",
              question:
                "I'd like to start with something a bit harder: tell me about a professional setback or mistake that was at least partly yours. What happened, and what did you learn?",
            },
            {
              category: "PROBLEM_SOLVING",
              question:
                "Tell me about a time you had to fix something that went wrong under time pressure.",
            },
            {
              category: "ADAPTABILITY",
              question:
                "Describe a time you had to learn a new tool, process, or skill quickly. How did you approach it?",
            },
            {
              category: "REFLECTION",
              question:
                "What did that experience change about how you work today?",
            },
          ],
        },
      },
      {
        id: "collaboration-under-pressure",
        category: "COLLABORATION",
        openingMessage:
          "Let's talk about working with others. Tell me about a time you had to collaborate with someone whose working style clashed with yours. How did you handle it?",
        counterpartBrief:
          "Explore how the candidate kept the working relationship functional while addressing friction. Probe what they actually said, how the other person reacted, and what the result was. Do not accept vague answers like 'we talked it out' without specifics. Watch for candidates who take all the credit or all the blame; ask for the balanced version.",
        interviewTrack: {
          questions: [
            {
              category: "TEAMWORK_CONFLICT",
              question:
                "Let's talk about working with others. Tell me about a time you had to collaborate with someone whose working style clashed with yours. How did you handle it?",
            },
            {
              category: "OWNERSHIP",
              question:
                "Describe a time you took responsibility for a team's mistake or a missed deadline that wasn't solely yours.",
            },
            {
              category: "PROBLEM_SOLVING",
              question:
                "Tell me about a time you had to deliver with limited information, time, or resources.",
            },
            {
              category: "REFLECTION",
              question:
                "If you faced the same situation again, what would you do differently?",
            },
          ],
        },
      },
    ],
  });
