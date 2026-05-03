import { z } from 'zod';

// Study Sessions
export const createSessionSchema = z.object({
  subjectId: z.string().uuid(),
  timerMode: z.enum(['pomodoro', 'custom', 'open-ended']),
  timerDurationMinutes: z.number().min(1).max(180).nullable(),
  sessionGoal: z.string().max(200).nullable(),
});

export const completeSessionSchema = z.object({
  focusRating: z.number().int().min(1).max(5).nullable(),
  mood: z.string().max(50).nullable(),
});

export const createNoteSchema = z.object({
  sessionId: z.string().uuid(),
  content: z.string().min(1).max(10000),
  timestampOffset: z.number().int().min(0),
});

// Subjects
export const createSubjectSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  icon: z.string().max(50).nullable(),
});

// Habits
export const logHabitSchema = z.object({
  type: z.enum(['sleep', 'water', 'exercise', 'meal', 'mood']),
  value: z.number().min(0).max(24), // flexible: hours for sleep, glasses for water, etc.
});

// Goals
export const createGoalSchema = z.object({
  subjectId: z.string().uuid().nullable(),
  type: z.enum(['weekly_hours', 'exam_prep', 'habit_consistency']),
  target: z.number().positive(),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
});

// Tasks
export const createTaskSchema = z.object({
  subjectId: z.string().uuid().nullable(),
  title: z.string().min(1).max(200),
  dueDate: z.string().datetime().nullable(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
});

// Social
export const sendFriendRequestSchema = z.object({
  friendId: z.string().uuid(),
});

export const createChallengeSchema = z.object({
  name: z.string().min(1).max(100),
  targetHours: z.number().positive().max(168), // max 1 week of hours
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

// Inferred types for form usage
export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type CompleteSessionInput = z.infer<typeof completeSessionSchema>;
export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;
export type LogHabitInput = z.infer<typeof logHabitSchema>;
export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type CreateChallengeInput = z.infer<typeof createChallengeSchema>;
