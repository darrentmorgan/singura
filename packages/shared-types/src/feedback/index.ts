import { z } from 'zod';

// Feedback Action Enum
export const FeedbackActionEnum = z.enum([
  'APPROVE',
  'IGNORE',
  'FLAG_FALSE_POSITIVE',
  'FLAG_HIGH_RISK'
]);
export type FeedbackAction = z.infer<typeof FeedbackActionEnum>;

// Comprehensive Feedback Type with Rich Metadata
export const FeedbackEntrySchema = z.object({
  id: z.string().uuid(),
  detectionId: z.string(),
  organizationId: z.string(),
  userId: z.string(),
  action: FeedbackActionEnum,
  comment: z.string().optional(),
  timestamp: z.date(),
  detectionMetadata: z.record(z.string(), z.unknown()),
  userContext: z.object({
    role: z.string().optional(),
    department: z.string().optional(),
    securityClearance: z.number().optional()
  }).optional(),
  sensitivity: z.number().min(0).max(1).optional() // Learning algorithm sensitivity score
});

export type FeedbackEntry = z.infer<typeof FeedbackEntrySchema>;

// Learning Algorithm Configuration
export const LearningConfigSchema = z.object({
  organizationId: z.string(),
  baseSensitivity: z.number().min(0).max(1).default(0.5),
  customSensitivityThresholds: z.record(z.string(), z.number().min(0).max(1)),
  detectionCategories: z.array(z.string()),
  learningRate: z.number().min(0).max(1).default(0.1)
});

export type LearningConfig = z.infer<typeof LearningConfigSchema>;

// Feedback Effectiveness Metrics
export const FeedbackEffectivenessSchema = z.object({
  organizationId: z.string(),
  timeframe: z.object({
    start: z.date(),
    end: z.date()
  }),
  metrics: z.object({
    totalDetections: z.number(),
    truePositives: z.number(),
    falsePositives: z.number(),
    accuracyRate: z.number().min(0).max(1),
    sensitivityAdjustments: z.array(z.object({
      category: z.string(),
      previousSensitivity: z.number(),
      newSensitivity: z.number(),
      reason: z.string()
    }))
  })
});

export type FeedbackEffectiveness = z.infer<typeof FeedbackEffectivenessSchema>;