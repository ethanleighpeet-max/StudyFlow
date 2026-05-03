import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  real,
  boolean,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const timerModeEnum = pgEnum('timer_mode', ['pomodoro', 'custom', 'open-ended']);
export const habitTypeEnum = pgEnum('habit_type', ['sleep', 'water', 'exercise', 'meal', 'mood']);
export const goalTypeEnum = pgEnum('goal_type', ['weekly_hours', 'exam_prep', 'habit_consistency']);
export const priorityEnum = pgEnum('priority', ['low', 'medium', 'high']);
export const friendshipStatusEnum = pgEnum('friendship_status', [
  'pending',
  'accepted',
  'declined',
]);
export const premiumTierEnum = pgEnum('premium_tier', ['free', 'pro']);

// ==================== TABLES ====================

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkId: text('clerk_id').unique().notNull(),
  email: text('email').unique().notNull(),
  name: text('name').notNull(),
  avatarUrl: text('avatar_url'),
  premiumTier: premiumTierEnum('premium_tier').default('free').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const subjects = pgTable('subjects', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  color: text('color').notNull().default('#6366F1'),
  icon: text('icon'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const studySessions = pgTable('study_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  subjectId: uuid('subject_id')
    .references(() => subjects.id, { onDelete: 'set null' }),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  timerMode: timerModeEnum('timer_mode').notNull(),
  timerDurationMinutes: integer('timer_duration_minutes'),
  focusRating: integer('focus_rating'), // 1-5
  mood: text('mood'),
  sessionGoal: text('session_goal'),
  notesCount: integer('notes_count').default(0).notNull(),
});

export const sessionNotes = pgTable('session_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id')
    .references(() => studySessions.id, { onDelete: 'cascade' })
    .notNull(),
  content: text('content').notNull(),
  timestampOffset: integer('timestamp_offset').notNull(), // seconds from session start
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const habits = pgTable('habits', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  type: habitTypeEnum('type').notNull(),
  value: real('value').notNull(),
  loggedAt: timestamp('logged_at', { withTimezone: true }).defaultNow().notNull(),
});

export const goals = pgTable('goals', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  subjectId: uuid('subject_id').references(() => subjects.id, { onDelete: 'set null' }),
  type: goalTypeEnum('type').notNull(),
  target: real('target').notNull(),
  periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
  periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  subjectId: uuid('subject_id').references(() => subjects.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  dueDate: timestamp('due_date', { withTimezone: true }),
  priority: priorityEnum('priority').default('medium').notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const friendships = pgTable('friendships', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  friendId: uuid('friend_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  status: friendshipStatusEnum('status').default('pending').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const groupChallenges = pgTable('group_challenges', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  targetHours: real('target_hours').notNull(),
  startDate: timestamp('start_date', { withTimezone: true }).notNull(),
  endDate: timestamp('end_date', { withTimezone: true }).notNull(),
  createdBy: uuid('created_by')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const challengeMembers = pgTable('challenge_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  challengeId: uuid('challenge_id')
    .references(() => groupChallenges.id, { onDelete: 'cascade' })
    .notNull(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  progressMinutes: integer('progress_minutes').default(0).notNull(),
  joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
});

// ==================== RELATIONS ====================

export const usersRelations = relations(users, ({ many }) => ({
  subjects: many(subjects),
  studySessions: many(studySessions),
  habits: many(habits),
  goals: many(goals),
  tasks: many(tasks),
  friendshipsInitiated: many(friendships, { relationName: 'initiator' }),
  friendshipsReceived: many(friendships, { relationName: 'receiver' }),
}));

export const subjectsRelations = relations(subjects, ({ one, many }) => ({
  user: one(users, { fields: [subjects.userId], references: [users.id] }),
  studySessions: many(studySessions),
  goals: many(goals),
  tasks: many(tasks),
}));

export const studySessionsRelations = relations(studySessions, ({ one, many }) => ({
  user: one(users, { fields: [studySessions.userId], references: [users.id] }),
  subject: one(subjects, { fields: [studySessions.subjectId], references: [subjects.id] }),
  notes: many(sessionNotes),
}));

export const sessionNotesRelations = relations(sessionNotes, ({ one }) => ({
  session: one(studySessions, {
    fields: [sessionNotes.sessionId],
    references: [studySessions.id],
  }),
}));

export const habitsRelations = relations(habits, ({ one }) => ({
  user: one(users, { fields: [habits.userId], references: [users.id] }),
}));

export const goalsRelations = relations(goals, ({ one }) => ({
  user: one(users, { fields: [goals.userId], references: [users.id] }),
  subject: one(subjects, { fields: [goals.subjectId], references: [subjects.id] }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  user: one(users, { fields: [tasks.userId], references: [users.id] }),
  subject: one(subjects, { fields: [tasks.subjectId], references: [subjects.id] }),
}));

export const friendshipsRelations = relations(friendships, ({ one }) => ({
  user: one(users, {
    fields: [friendships.userId],
    references: [users.id],
    relationName: 'initiator',
  }),
  friend: one(users, {
    fields: [friendships.friendId],
    references: [users.id],
    relationName: 'receiver',
  }),
}));

export const groupChallengesRelations = relations(groupChallenges, ({ one, many }) => ({
  creator: one(users, { fields: [groupChallenges.createdBy], references: [users.id] }),
  members: many(challengeMembers),
}));

export const challengeMembersRelations = relations(challengeMembers, ({ one }) => ({
  challenge: one(groupChallenges, {
    fields: [challengeMembers.challengeId],
    references: [groupChallenges.id],
  }),
  user: one(users, { fields: [challengeMembers.userId], references: [users.id] }),
}));
