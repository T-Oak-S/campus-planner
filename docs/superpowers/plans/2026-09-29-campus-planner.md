# Campus Planner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish a responsive Chinese campus planner that combines the supplied semester timetable, personal activities, tasks, conflict detection, calendar export, backup, and optional Supabase synchronization.

**Architecture:** A Vite React single-page app keeps calendar rules in pure TypeScript domain modules and UI state behind a repository interface. Local storage provides the zero-config experience; an optional Supabase adapter adds GitHub sign-in and per-user synchronization. Static assets deploy to GitHub Pages through Actions.

**Tech Stack:** React, TypeScript, Vite, Vitest, Testing Library, Supabase JS, CSS, GitHub Actions

**Spec:** `docs/superpowers/specs/2026-09-29-campus-planner-design.md`

## Global Constraints

- Chinese UI, responsive for mobile and desktop, with four primary views: 今日、日历、任务、设置。
- Semester week 1 starts Monday 2026-09-21 in Asia/Shanghai; holidays do not renumber weeks.
- Course export and time-based conflict checks activate only when required period times exist.
- GitHub Pages production base is `/campus-planner/`; no secrets or source images enter the repository.
- Supabase RLS must restrict every personal row to `auth.uid()`; local mode remains usable without environment variables.

## Review Focus

- A makeup day must use the replaced date's weekday and teaching-week rules while retaining the makeup date as the occurrence date.
- Multi-rule courses must not merge away distinct week ranges, rooms, or period ranges.
- Overnight, zero-length, and invalid imported records must be rejected without losing current data.
- Recurring activity edits must distinguish one occurrence from the entire series.
- ICS text must escape punctuation and emit local Asia/Shanghai date-times with a 15-minute alarm.

---

### Task 1: Project foundation and academic calendar engine

**Files:** Create project configuration, `src/domain/types.ts`, `src/domain/calendar.ts`, `src/data/defaultSchedule.ts`, and their tests.

**Interfaces:** Produce `getTeachingWeek(date)`, `expandCourseOccurrences(rules, range, exceptions, overrides)`, and the typed default schedule.

- [ ] Write failing tests for normal weeks, weeks 1/9/11/14/16, holidays, exam period, both makeup days, and overrides.
- [ ] Run the focused tests and confirm the missing-module failure.
- [ ] Implement the minimum typed calendar engine and transcribed schedule to pass.
- [ ] Run the full suite and commit the foundation.

### Task 2: Activities, tasks, conflicts, free time, backup, and ICS

**Files:** Create `src/domain/activities.ts`, `src/domain/tasks.ts`, `src/domain/backup.ts`, `src/domain/ics.ts`, plus tests.

**Interfaces:** Produce occurrence expansion, overlap detection, free-slot calculation, validated JSON import/export, and `buildIcsCalendar()`.

- [ ] Write failing tests for single/weekly events, occurrence-only edits, conflicts, free slots, task ordering, bad imports, ICS escaping, and reminders.
- [ ] Run tests and verify expected failures.
- [ ] Implement the smallest domain functions that pass, then run the complete suite.
- [ ] Refactor shared date helpers while green and commit.

### Task 3: Persistence and optional Supabase synchronization

**Files:** Create `src/data/repository.ts`, `src/data/localRepository.ts`, `src/data/supabaseRepository.ts`, `supabase/schema.sql`, `.env.example`, and tests.

**Interfaces:** Expose a repository for loading/saving planner data, authentication state, retryable errors, and conflict results.

- [ ] Write failing repository contract tests for local persistence, per-user payload shape, stale-write conflicts, and failed-save retry state.
- [ ] Implement local and Supabase adapters, schema, RLS policies, and environment detection.
- [ ] Run repository tests and full suite; commit.

### Task 4: Responsive application UI

**Files:** Create `src/App.tsx`, page/components/hooks/styles, icons and manifest; add UI tests.

**Interfaces:** Four-view SPA consuming the repository and domain APIs, with forms for activities/tasks/periods and dialogs for conflicts and recurring edits.

- [ ] Write failing user-flow tests for navigation, adding and editing activities, completing tasks, changing teaching weeks, and backup/ICS controls.
- [ ] Implement the responsive shell, 今日、日历、任务、设置 views and accessible dialogs/forms.
- [ ] Run UI tests, fix accessibility failures, and run the full suite.
- [ ] Test the production build and commit.

### Task 5: Deployment and handoff

**Files:** Create `.github/workflows/deploy.yml`, `README.md`, and finalize application metadata.

**Interfaces:** Production build deployable to `https://t-oak-s.github.io/campus-planner/`.

- [ ] Add deployment workflow and setup documentation for Supabase GitHub OAuth, environment variables, Pages, calendar replacement, and backups.
- [ ] Run tests, type-check, production build, and preview smoke checks.
- [ ] Verify no secrets or source images are tracked, compare requirements against the design, and commit.
- [ ] Create/push the GitHub repository, enable Pages through the workflow, and verify the public URL.
