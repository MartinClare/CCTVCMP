import { z } from "zod";

const safetyCategorySchema = z.object({
  summary: z.string(),
  issues: z.array(z.string()),
  recommendations: z.array(z.string()),
});

const analysisSchema = z.object({
  overallDescription: z.string(),
  overallRiskLevel: z.enum(["Low", "Medium", "High"]),
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
  analysis: analysisSchema,
});

export type EdgeReportPayload = z.infer<typeof edgeReportSchema>;
