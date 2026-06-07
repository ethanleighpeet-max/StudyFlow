# StudyFlow — Finish Prototype Today (Sun, June 7)

Goal: a demo-ready prototype where the IBP's core claim — *study performance and wellbeing are connected* — is visible in the app. Everything below is web only; mobile (Phase 5) is out of scope today.

## Step 0 — Unblock the database (15 min) ⛔ BLOCKER
The "password authentication failed" error means the password on the DB doesn't match what Vercel sends. Fix deterministically:
1. Supabase dashboard → project **studyflow-dev** → Project Settings → Database → **Reset database password** → set it to exactly `Tingoyito05!`
2. No redeploy needed (env var unchanged). Retry "Start Session".
3. Claude verifies: user row + session row appear in DB.

## Step 1 — Verify Study Sessions end-to-end (30 min)
- Full flow: setup → timer → summary (focus + mood) → history page
- Check `/api/sessions/stats` numbers match logged sessions
- Fix any bugs found before moving on

## Step 2 — Phase 3B: Habit Tracking (3–4 h) ★ core differentiator
Schema is ready (`habits` table: type / value / loggedAt). Build:
- `/api/habits` (GET by date range, POST log, DELETE)
- `/dashboard/habits` page: today view with 4 quick-log cards — sleep (hours), water (glasses), exercise (minutes), mood (1–5)
- Streak indicators + last-7-days mini history per habit
- Sidebar nav entry + dashboard stat card wiring

## Step 3 — Goals & Tasks, simplified (2–2.5 h)
Schema ready for both. Keep deliberately minimal:
- **Goals**: list + create (title, target, optional subject, deadline), progress bar, mark complete
- **Tasks**: list + create (title, subject, due date), checkbox complete, group by today / upcoming / done
- One API route + one page each; reuse existing card/list components

## Step 4 — Insights page (1.5–2 h) ★ the IBP money shot
This is what sells the concept to the professor:
- `/api/insights`: join sessions + habits by day
- Charts: focus rating vs. sleep hours; study minutes per day overlaid with habit completion; weekly summary numbers
- One headline correlation card, e.g. "You focus 23% better after 7+ hours of sleep"

## Step 5 — Demo prep & polish (1 h)
- Seed realistic demo data (2 weeks of sessions + habits) so charts look alive
- Click through every page; fix empty states and obvious visual bugs
- Confirm production deploy works on a fresh login

## Cut today (defer)
Friendships, group challenges, smart reminders, mobile app, settings page.

## Risk notes
- Supabase free tier pauses after ~1 week idle → before any demo, check project status first (Claude can restore it)
- Vercel gotchas already configured: install command override, Node 20.20.2, `noUncheckedIndexedAccess` guards, static Tailwind class maps
