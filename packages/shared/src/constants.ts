// Timer defaults (from PRD: flexible intervals 15-90 minutes)
export const TIMER = {
  POMODORO_WORK: 25,
  POMODORO_BREAK: 5,
  POMODORO_LONG_BREAK: 15,
  CUSTOM_MIN: 15,
  CUSTOM_MAX: 90,
  CUSTOM_DEFAULT: 45,
  AUTO_SAVE_INTERVAL_MS: 5000, // Notes auto-save every 5 seconds
} as const;

// Habit tracking
export const HABITS = {
  WATER_DAILY_TARGET: 8, // glasses
  SLEEP_IDEAL_MIN: 7,
  SLEEP_IDEAL_MAX: 9,
  STREAK_GRACE_DAYS: 1, // streaks don't break for 1 missed day
  MOOD_SCALE: { min: 1, max: 5 },
  MEAL_QUALITY_SCALE: { min: 1, max: 5 },
} as const;

// Analytics
export const ANALYTICS = {
  WEEKLY_SUMMARY_DAY: 0, // Sunday
  WEEKLY_SUMMARY_HOUR: 19, // 7 PM
  MIN_SESSIONS_FOR_INSIGHT: 5, // minimum sessions before showing correlations
  CORRELATION_THRESHOLD: 0.3, // minimum correlation coefficient to show insight
} as const;

// Social
export const SOCIAL = {
  MAX_GROUP_SIZE: 20,
  MAX_CHALLENGE_DAYS: 30,
} as const;

// Feature limits by tier
export const TIER_LIMITS = {
  free: {
    maxSubjects: 5,
    maxGoals: 3,
    analyticsHistoryDays: 30,
    socialFeatures: false,
    insightCards: 1,
  },
  pro: {
    maxSubjects: Infinity,
    maxGoals: Infinity,
    analyticsHistoryDays: 365,
    socialFeatures: true,
    insightCards: Infinity,
  },
} as const;
