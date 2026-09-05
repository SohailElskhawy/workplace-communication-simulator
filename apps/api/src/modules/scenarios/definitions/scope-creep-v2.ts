import {
  ScenarioDefinitionSchema,
  type ScenarioDefinition,
} from "../scenario-definition.js";
import { scopeCreepV1 } from "./scope-creep.js";

export const scopeCreepV2: ScenarioDefinition = ScenarioDefinitionSchema.parse({
  ...scopeCreepV1,
  version: 2,
  variations: [
    {
      id: "urgent-request",
      category: "URGENT_REQUEST",
      openingMessage:
        "Quick but important: leadership just asked for a competitive analysis deck by Friday morning. I know you're already committed to the migration plan, but this one is time-sensitive and you're the only one who knows the data. Can you take it on top of everything else?",
      openingMessageAr:
        "حاجة سريعة بس في غاية الأهمية: الإدارة لسه طالبة بريزنتيشن تحليل للمنافسين يوم الجمعة الصبح. عارف إنك ملتزم تماماً بخطة الترحيل، بس الموضوع ده عاجل جداً وانت الوحيد اللي فاهم الأرقام دي كويس. تقدر تشيلها مع باقي الشغل اللي معاك؟",
      counterpartBrief:
        "You frame the request as urgent and non-negotiable because leadership asked directly, but you have not checked what it displaces. When the learner explains their capacity, ask what could move instead of accepting a flat no. If they present a clear trade-off, choose between the options and confirm the decision in writing. Do not threaten; appeal to visibility and urgency.",
    },
    {
      id: "stakeholder-pressure",
      category: "STAKEHOLDER_PRESSURE",
      openingMessage:
        "I just came out of the steering meeting and your name came up. The executives expect the new dashboard to be part of Friday's review, alongside everything already promised. I need you to make the room happy here—how do we make that happen?",
      openingMessageAr:
        "لسه خارج من ميتنج الإدارة واسمك جه في الكلام. القيادات مستنيين الداشبورد الجديدة تكون جاهزة في مراجعة الجمعة مع كل الحاجات التانية المتفق عليها. محتاجك تبسط الناس في الميتنج ده—نقدر نطلع بيها إزاي؟",
      counterpartBrief:
        "You are relaying executive expectations and feel pressure to return with a yes. Emphasize who is watching and what a no might cost, while being honest that you don't know the learner's current workload in detail. If the learner holds a firm, professional boundary and explains consequences, shift to negotiating which deliverable slips and offer to communicate the trade-off to leadership yourself. Do not fabricate an executive mandate beyond what was actually said.",
    },
    {
      id: "repeated-additions",
      category: "REPEATED_ADDITIONS",
      openingMessage:
        "Two small things, I promise—just a quick slide for the client deck and a minor tweak to the summary. Each one is maybe an hour. While you're in there, could you also update the numbers to this morning's data? That's everything, I think.",
      openingMessageAr:
        "حاجتين صغيرين خالص والله—سلايد سريعة لعرض العميل وتعديل بسيط في الملخص. كل واحدة مش هتاخد ساعة. وبالمرة وإنت شغال هناك، ممكن تحدث الأرقام ببيانات النهاردة الصبح؟ كده كل حاجة تمام أعتقد.",
      counterpartBrief:
        "You genuinely see each item as small and are unaware of how the additions accumulate. If the learner pushes back on the pattern rather than a single task, get slightly defensive: 'it's just an hour each.' If they quantify the total impact and propose a boundary, such as one consolidated change window per week, accept it and agree to batch future requests. Do not add yet another request during the conversation.",
    },
    {
      id: "commitment-conflict",
      category: "COMMITMENT_CONFLICT",
      openingMessage:
        "I need the vendor comparison finished by Thursday so I can present it to procurement. I know you told me the compliance audit lands the same day, but procurement is waiting on me and the audit has some slack, right? You'll figure it out.",
      openingMessageAr:
        "محتاج مقارنة الموردين تخلص قبل الخميس عشان أقدمها للمشتريات. عارف إنك قولتلي إن تدقيق الامتثال هيتسلم في نفس اليوم، بس المشتريات مستنياني والتدقيق فيه براح في الوقت شوية، مش كده؟ اتصرف وظبطها.",
      counterpartBrief:
        "You know about the audit but assume it has slack because it has slipped before. Press that assumption directly: ask why the audit cannot absorb the work. If the learner explains the real conflict and offers options—delaying the comparison, splitting it, or bringing in help—engage seriously and pick one. If they simply refuse, ask what specifically breaks, and accept a firm boundary when it is explained without hostility.",
    },
  ],
});
