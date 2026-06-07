# StudyFlow — Full Feature Implementation Plan

Goal: take every page from "technically works" to **genuinely useful per the PRD**. The current versions are thin CRUD shells — this plan closes the gap feature by feature, ordered so each work session ends with something demo-ready.

---

## Honest gap analysis (what exists vs. what the PRD demands)

| Feature | PRD ref | Built today | What's missing (why it feels useless) |
|---|---|---|---|
| Study Sessions | 4.1 | Timer, notes, summary, history ✅ | Notes **search across sessions**, filter by subject, subject management UI, break tracking, background-tab accuracy |
| Habit Tracking | 4.2 | 4 quick-log cards, streaks, 7-day bars | **Morning check-in flow** (one 15-second screen), meals habit, customizable water target, **streak calendar**, evening reflection, grace-period streaks |
| Goals | 4.3 | Create/delete, auto progress | **Smart suggestions** ("last week you did 4.5h — aim for 5?"), **exam countdown with daily study recommendations**, goal completion celebration |
| Tasks | 4.3 | Quick-add, grouping, complete | **Weekly planner view**, gentle overdue nudges, edit-in-place |
| Insights | 4.4 | Correlation cards, study/sleep chart | **Study hours by subject**, habit trend lines, **auto weekly summary (Sunday)** + archive, comparison vs. personal averages |
| Dashboard | 6 | Real stat numbers | "Recent sessions" and "Today's habits" cards are **permanently empty placeholders** — must show real data |
| Social | 4.5 | Schema only | Friends via invite link, group challenges with shared progress bar, accountability nudges |
| Profile/Settings | 6 | Nothing | Subjects manager, notification prefs, privacy, **GDPR export/delete**, tier display |
| Monetization | 9 | Tier limits in constants | Free-tier enforcement (1 subject free, insights gating), upgrade screen (mock checkout is fine for IBP) |
| Mobile | 7 | Expo scaffold only | Phase 5 — after web is complete |

---

## Guiding rule

A feature is "done" when it **closes a loop with the user's real data** — not when the form saves. Every phase below ends with a checkpoint you can click through.

---

## Phase A — Make what exists feel alive (highest demo value per hour)

**A1. Dashboard real content** — replace both placeholder cards:
- Recent Study Sessions: last 3 sessions with subject color, duration, focus stars
- Today's Habits: live mini-version of the 4 habit cards with one-tap logging right from the dashboard
- Acceptance: a new user sees their data on the dashboard within seconds of acting

**A2. Subjects manager** — small modal/section in Study setup + Profile:
- Create/rename/recolor/archive subjects; enforce free-tier limit later
- Acceptance: timer setup never shows an empty subject picker dead-end

**A3. Seed button** — "Load demo data" button in Profile (calls the existing seed route), so demos never depend on visiting raw URLs

**A4. Notes search** (PRD 4.1 flow 4): search box on Study Log that searches note *content* across sessions, filter by subject
- Needs: extend `/api/sessions` with `q` + `subjectId` params joining `session_notes`

## Phase B — Habit depth (PRD 4.2 fidelity)

**B1. Morning check-in** — one dismissible card at top of dashboard before noon: sleep slider + mood emoji in a single row, < 15 seconds, gone once logged
**B2. Meals habit** — 5th card, quality rating 1-5 (enum already supports `meal`)
**B3. Streak calendar** — month grid per habit showing logged days; grace-day visualization (STREAK_GRACE_DAYS = 1 already in constants)
**B4. Custom water target** — per-user setting (needs `users.preferences` jsonb column — migration via Supabase MCP)
**B5. Evening reflection** — optional journal prompt after 7pm with day auto-summary; store as new `reflections` table (migration)

## Phase C — Goals & Tasks intelligence (PRD 4.3 fidelity)

**C1. Smart goal suggestions** — when creating a weekly_hours goal, show "Last week: Statistics 4.5h. Aim for 5h?" computed from real session history; one tap accepts
**C2. Exam countdown** — exam_prep goals get a countdown card + suggested daily hours = remaining target ÷ remaining days, recalculated nightly
**C3. Weekly planner view** — tasks laid out Mon–Sun columns for the current week; drag is optional, click-to-move is enough
**C4. Goal celebrations** — confetti/spring animation + accent state when progress crosses 100%

## Phase D — Insights that answer "is it enough?" (PRD 4.4 fidelity)

**D1. Study hours by subject** — stacked bar/donut for the selected period
**D2. Habit trend lines** — sleep, water, exercise over 30 days
**D3. Weekly summary** — generated for each past Sunday: hours, habit rates, best focus day, top insight; archive list in Insights (push notification deferred to mobile phase)
**D4. Personal averages comparison** — "this week vs. your 4-week average" on every chart

## Phase E — Social (PRD 4.5, schema already exists)

**E1. Friends** — invite link containing a signed token; friend list; pending/accept flow (`friendships` table ready)
**E2. Opt-in activity feed** — "Sofia finished a 45-min session" on dashboard; privacy toggle per user
**E3. Group challenges** — create challenge (name, target hours, dates), invite link, collective progress bar, celebration on completion (`group_challenges` + `challenge_members` ready)

## Phase F — Profile, monetization & GDPR (PRD 6 + 9)

**F1. Profile page** — account info, subjects manager, preferences, sign-out
**F2. Free-tier enforcement** — TIER_LIMITS from constants: subjects cap, insight-card cap, upgrade prompts
**F3. Upgrade screen** — pricing from PRD (€3.99/mo, €29.99/yr); mock checkout for the IBP demo (real Stripe later)
**F4. GDPR** — "Export my data" (JSON download) and "Delete my account" (cascading delete; schema already cascades)

## Phase G — Mobile companion (Expo) — after web is whole

Port the core loop only: timer + habit logging + dashboard. Web stays the analytics home (PRD 6 says mobile-primary, but for the IBP demo the finished web app is the asset; mobile is the roadmap slide).

---

## Suggested order of attack

1. **Phase A** (one session) — biggest perceived-quality jump, no migrations
2. **Phase C1 + C2** (one session) — makes Goals feel smart, pure computation
3. **Phase B** (one session) — one small migration, big daily-use value
4. **Phase D** (one session) — the IBP differentiator, charts demo beautifully
5. **Phase F** (one session) — monetization story for the business plan
6. **Phase E** (one-two sessions) — needs a second test account to demo
7. **Phase G** — separate track once web is frozen

Claude can execute every phase autonomously except final visual checks and `git push` (no GitHub credentials in the sandbox — each session ends with a ready commit for you to push).

## Technical notes

- Migrations go through Supabase MCP (`apply_migration`) + schema.ts update in the same commit
- New deps to avoid: charts stay hand-rolled SVG (on-brand, no bundle cost)
- Every new UI element follows the polish checklist in CLAUDE.md (spring animations, skeletons, animated empty states)
- Free-tier gating reads TIER_LIMITS — no hardcoded numbers
