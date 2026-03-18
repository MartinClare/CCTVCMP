import { z } from "zod";

const safetyCategorySchema = z.object({
  summary: z.string(),
  issues: z.array(z.string()),
  recommendations: z.array(z.string()),
});

const analysisSchema = z.object({
  overallDescription: z.string(),
  overallRiskLevel: z.enum(["Low", "Medium", "High", "Critical"]),
  constructionSafety: safetyCategorySchema,
  fireSafety: safetyCategorySchema,
  propertySecurity: safetyCategorySchema,
  // nullish() = accepts number | null | undefined — Python sends null when field is absent
  peopleCount: z.number().nullish(),
  missingHardhats: z.number().nullish(),
  missingVests: z.number().nullish(),
});

export const edgeReportSchema = z.object({
  edgeCameraId: z.string().min(1),
  cameraName: z.string(),
  timestamp: z.string(),
  messageType: z.enum(["analysis", "keepalive"]).default("analysis"),
  keepalive: z.boolean().default(false),
  eventImageIncluded: z.boolean().default(false),
  analysis: analysisSchema.optional(),
}).superRefine((val, ctx) => {
  const isKeepalive = val.keepalive || val.messageType === "keepalive";
  if (!isKeepalive && val.messageType === "analysis" && !val.analysis) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["analysis"],
      message: "analysis is required when messageType is 'analysis'",
    });
  }
});

export type EdgeReportPayload = z.infer<typeof edgeReportSchema>;
