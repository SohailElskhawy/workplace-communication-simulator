import { z } from "zod";

export const MeResponseSchema = z.object({
  data: z.object({
    id: z.uuid(),
  }),
});

export type MeResponse = z.infer<typeof MeResponseSchema>;
