// Core domain types matching the PRD data model

export type TimerMode = 'pomodoro' | 'custom' | 'open-ended';
export type HabitType = 'sleep' | 'water' | 'exercise' | 'meal' | 'mood';
export type GoalType = 'weekly_hours' | 'exam_prep' | 'habit_consistency';
export type FriendshipStatus = 'pending' | 'accepted' | 'declined';
export type PremiumTier = 'free' | 'pro';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  premiumTier: PremiumTier;
  createdAt: Date;
}

export interface Subject {
  id: string;
  userId: string;
  name: string;
  color: string;
  icon: string | null;
  createdAt: Date;
}

export interface StudySession {
  id: string;
  userId: string;
  subjectId: string;
  startedAt: Date;
  endedAt: Date | null;
  timerMode: TimerMode;
  timerDurationMinutes: number | null;
  focusRating: number | null; // 1-5
  mood: string | null;
  sessionGoal: string | null;
  notesCount: number;
}

export interface SessionNote {
  id: string;
  sessionId: string;
  content: string;
  timestampOffset: number; // seconds from session start
  createdAt: Date;
}

export interface Habit {
  id: string;
  userId: string;
  type: HabitType;
  value: number; // sleep hours, water glasses, exercise minutes, meal quality 1-5, mood 1-5
  loggedAt: Date;
}

export interface Goal {
  id: string;
  userId: string;
  subjectId: string | null;
  type: GoalType;
  target: number;
  periodStart: Date;
  periodEnd: Date;
}

export interface Task {
  id: string;
  userId: string;
  subjectId: string | null;
  title: string;
  dueDate: Date | null;
  priority: 'low' | 'medium' | 'high';
  completedAt: Date | null;
  createdAt: Date;
}

export interface Friendship {
  id: string;
  userId: string;
  friendId: string;
  status: FriendshipStatus;
  createdAt: Date;
}

export interface GroupChallenge {
  id: string;
  name: string;
  targetHours: number;
  startDate: Date;
  endDate: Date;
  createdBy: string;
}

export interface ChallengeMember {
  challengeId: string;
  userId: string;
  progressMinutes: number;
}
