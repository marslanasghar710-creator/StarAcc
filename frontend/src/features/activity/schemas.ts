import { z } from "zod";

export const activityCenterFilterSchema = z.object({
  q: z.string().optional(),
  action: z.string().optional(),
  entityType: z.string().optional(),
  actorEmail: z.string().email().optional().or(z.literal("")),
  entityId: z.string().optional(),
  createdFrom: z.string().optional(),
  createdTo: z.string().optional(),
}).refine((value) => {
  if (!value.createdFrom || !value.createdTo) {
    return true;
  }

  return value.createdFrom <= value.createdTo;
}, {
  message: "Created-to date must be on or after the created-from date.",
  path: ["createdTo"],
});
