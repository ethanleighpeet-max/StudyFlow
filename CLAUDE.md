# StudyFlow — Project Context for Claude Code

## What is this?
StudyFlow is a cross-platform student productivity app that connects study sessions with daily wellbeing habit tracking. It targets European university students aged 18-25.

## Architecture
- **Monorepo**: Turborepo with npm workspaces
- **apps/web**: Next.js 15 (App Router) — the primary product (web-first)
- **apps/mobile**: Expo / React Native — the mobile companion (Phase 5)
- **packages/shared**: TypeScript types, Zod validators, constants — shared across web & mobile
- **packages/db**: Drizzle ORM schema, database client, migrations — PostgreSQL via Supabase
- **packages/ui**: Shared UI components built with shadcn/ui patterns, Tailwind CSS, Motion (Framer Motion)

## Tech Stack
- **Language**: TypeScript 5.x (strict mode, noUncheckedIndexedAccess)
- **Frontend**: Next.js 15, React 19, Tailwind CSS, shadcn/ui patterns, Motion
- **State**: Zustand (client state), TanStack Query (server state)
- **Backend**: Supabase (PostgreSQL, Auth via Clerk webhook sync, Storage, Edge Functions, Realtime)
- **ORM**: Drizzle ORM (code-first, SQL-close)
- **Auth**: Clerk (pre-built UI components, synced to Supabase via webhooks)
- **Payments**: Stripe (via Clerk Billing integration)
- **Deploy**: Vercel (web), EAS Build + Update (mobile)
- **Testing**: Vitest (unit/component), Playwright (E2E)
- **Linting**: Biome (replaces ESLint + Prettier)
- **Animations**: Motion (web), React Native Reanimated (mobile), Rive (interactive), Lottie (playback)

## Design System
- **Brand mood**: Calm & Focused — "Headspace meets Notion"
- **Primary color**: Deep Teal (#0F8B8D) — focus (blue) + wellbeing (green), based on color psychology research
- **Secondary color**: Soft Violet (#7C6FAE) — contemplation, insights, premium tier differentiation
- **Accent color**: Warm Amber (#E09F3E) — motivation, streaks, achievements, CTAs
- **Neutrals**: Warm stone grays (surface-50 through surface-950) — avoids clinical feel
- **Typography**: Inter (body/UI), DM Sans (headings) — geometric warmth with clean readability
- **Border radius**: Rounded (0.5rem default, 0.75rem lg, 1rem xl) — soft, approachable
- **Shadows**: Teal-tinted subtle shadows (shadow-soft, shadow-card, shadow-glow)
- **Animations**: Spring physics (stiffness 400, damping 17) via Motion — every interactive element animates
- **Color tokens**: Full 50–950 scale for brand, secondary, accent in `tailwind.config.ts` and `packages/ui/src/tokens.ts`
- **Logo**: Abstract mark + wordmark (to be generated)

## Conventions
- Use `@/` path alias for app-local imports
- Use `@studyflow/shared`, `@studyflow/db`, `@studyflow/ui` for package imports
- All API routes use Next.js Route Handlers in `app/api/`
- Validate all inputs with Zod schemas from `@studyflow/shared`
- Never store server state in Zustand — use TanStack Query
- Every interactive element must have a Motion/Reanimated animation (no static buttons)
- Loading states use skeleton shimmers, never spinners
- Use single quotes, 2-space indent, trailing commas (enforced by Biome)

## Database
- Project: `studyflow-dev` on Supabase (eu-west-1)
- Project ID: `xqzaiejgbxmimgwsvlos`
- API URL: `https://xqzaiejgbxmimgwsvlos.supabase.co`
- Schema defined in `packages/db/src/schema.ts`
- 10 tables: users, subjects, study_sessions, session_notes, habits, goals, tasks, friendships, group_challenges, challenge_members

## Key Files
- `turbo.json` — Turborepo task pipeline config
- `biome.json` — Linter/formatter config
- `packages/db/src/schema.ts` — Complete database schema
- `packages/shared/src/validators.ts` — All Zod validation schemas
- `packages/shared/src/constants.ts` — App-wide constants and tier limits
- `packages/shared/src/types.ts` — TypeScript domain types
- `apps/web/tailwind.config.ts` — Theme tokens (colors, fonts, animations)
- `apps/web/src/app/layout.tsx` — Root layout with providers

## PRD Reference
The full Product Requirements Document is at `../StudyFlow_PRD.md`. Core features:
1. Study Sessions with Timer & Notes (PRD 4.1)
2. Habit Tracking for Wellbeing (PRD 4.2)
3. Goal Setting & Academic Planning (PRD 4.3)
4. Analytics & Insights Dashboard (PRD 4.4)
5. Social & Community Features (PRD 4.5)
