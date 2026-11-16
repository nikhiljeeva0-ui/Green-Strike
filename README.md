# GREENSTRIKE

**Every Day Counts.**

GREENSTRIKE is a simple, beautiful habit tracker built around one idea:

> Create a habit → show up → mark it complete → see a green dot.

Every habit you create gets its **own GitHub-style contribution calendar**. A completed day is a green square. A missed day is an empty one. There are no scores, no levels and no clutter. Your calendars are the product, and everything else exists to support them.

*Created by Nikhil Jeeva.*

---

## Table of contents

1. [The idea](#the-idea)
2. [Why separate calendars?](#why-separate-calendars)
3. [Features](#features)
4. [How it works](#how-it-works)
5. [Tech stack](#tech-stack)
6. [Project structure](#project-structure)
7. [Data model](#data-model)
8. [Security](#security)
9. [Getting started](#getting-started)
10. [Firebase setup](#firebase-setup)
11. [Scripts and testing](#scripts-and-testing)
12. [Deployment](#deployment)
13. [Design system](#design-system)
14. [Design principles](#design-principles)
15. [What GREENSTRIKE is not](#what-greenstrike-is-not)

---

## The idea

Most habit apps try to do too much: points, badges, reminders, categories, analytics, social feeds. That complexity gets in the way of the one thing that matters: **did you show up today?**

GitHub's contribution graph shows that a wall of green squares is a powerful motivator. You see your consistency at a glance and you don't want to break the chain. GREENSTRIKE takes that idea and applies it to **any habit in your life**:

- Workout
- Startup work
- Business learning
- College study
- Reading, running, meditation, drinking water, coding
- Anything personal you define yourself

You are never forced into predefined categories. You name the habit, pick an icon, and start filling in your calendar.

It is made for students, entrepreneurs, professionals, fitness enthusiasts, developers and creators, and for anyone who wants to build consistency.

A first-time user should understand the product in about 10 seconds, and be able to add a habit and mark it complete within a few seconds.

---

## Why separate calendars?

Merging all your habits into a single graph hides the truth. If you worked out but skipped studying, one combined square can't tell you that.

In GREENSTRIKE:

- Each habit has a **completely independent 365-day calendar**.
- Each habit has its **own streak, total, and completion percentage**.
- Each habit's calendar has **its own range selector** (changing one never changes another).
- Completions are stored **per habit**, so habits never share data.

This is the core rule of the codebase. The `HabitCalendar` component accepts exactly one habit and only that habit's completion dates.

---

## Features

### Habits
- Create unlimited-feeling personal habits (up to 30 active at a time)
- Name, optional description, icon (fitness, book, laptop, rocket, brain, running, water, or any custom emoji)
- Optional cover image and optional reminder time
- Edit, archive (history is preserved) and delete (with a confirmation that shows how many completed days will be removed)

### Contribution calendars
- Monday-first weekly columns with month labels along the top and weekday labels on the left
- Two states only: completed (green) and not completed (empty)
- Future dates are disabled and can never be marked
- Today is outlined so it is easy to find
- Five ranges per habit: **30 days, 6 months, full year (rolling 365 days, default), this year, last year**
- Hover tooltips on desktop, tap popovers on touch screens
- Mark or undo any past date or today, so you can backfill if you forgot
- Full keyboard navigation with arrow keys and screen-reader labels on every date
- Each calendar scrolls horizontally on its own on small screens, and calendars are never merged or shrunk to fit

### The signature moment
When you complete a habit, the square pops, fills with emerald and releases a soft ripple, and the streak and totals count up to their new values. It is short and satisfying, and it respects `prefers-reduced-motion`.

### Stats
Each habit shows:
- **Current streak:** consecutive days completed. If today isn't done yet, your streak is not broken until the day ends.
- **Longest streak**
- **Total completed days**
- **Completion percentage**

The dashboard adds today's progress, the best current streak (with the habit's name), and an overall completion percentage.

### Pages
| Route | What it does |
|---|---|
| `/` | Cinematic landing page |
| `/auth` | Log in, sign up, password reset, Google sign-in |
| `/dashboard` | Greeting, live date and clock, summary stats, one card per habit |
| `/habits` | Manage habits: edit, archive, unarchive, delete |
| `/habits/:habitId` | Habit detail with full-year calendar and recent history |
| `/calendar` | Every active habit's full-year calendar, stacked and independent |
| `/settings` | Name, avatar, theme, timezone, reminders, log out |

### Other
- Dark mode by default, plus light mode and a system option, with no flash on load
- Timezone-aware "today" that rolls over at midnight without a refresh
- In-app reminder banner at the time you set (it appears while the app is open)
- Responsive from 360px phones to wide desktops

---

## How it works

### Dates are plain strings
Every date is a `YYYY-MM-DD` string in **your** timezone. Date math uses UTC-midnight arithmetic so daylight-saving changes and timezone boundaries can never shift a day. Streaks, totals and percentages are **derived** from a habit's set of completed dates, so they are never stored and can never drift out of sync.

### Streak rule
A streak is the number of consecutive calendar days with a completion for that habit. If today is not yet completed, the streak counts back from yesterday.

### Completion percentage
`completed days ÷ eligible days`, where eligible days run from the habit's first day (its creation date, or an earlier backfilled completion) through today.

### Optimistic updates
Marking a date updates the screen immediately. If the save fails, the change is rolled back and an error is shown. Double-clicks are ignored.

---

## Tech stack

| Area | Technology |
|---|---|
| UI | React + TypeScript |
| Build | Vite |
| Styling | Tailwind CSS v4 (CSS-first tokens) |
| Data fetching and cache | TanStack Query |
| Animation | Motion |
| Icons | Lucide |
| Authentication | Firebase Authentication (Google sign-in and Email/Password) |
| Database | Cloud Firestore |
| File storage | Firebase Storage (optional; falls back to small inline images) |
| Hosting | Firebase Hosting |
| Fonts | Geist Variable (interface) and Instrument Serif (editorial headlines) |

---

## Project structure

```
src/
  components/    HabitCalendar, ContributionSquare, MonthLabels, DayLabels,
                 RangeSelector, HabitCard, HabitDetailPanel, AddHabitModal,
                 MainNavigation, HeroSection, ReminderBanner, ...
  pages/         LandingPage, AuthPage, DashboardPage, HabitsPage,
                 HabitDetailPage, CalendarPage, SettingsPage, NotFoundPage
  hooks/         useTheme, useHabitQueries, useToday, useClock, ...
  lib/
    dates.ts     Timezone-safe date helpers, range and week-grid builders
    stats.ts     Current/longest streak, totals, completion percentage
    firebase.ts  Firebase initialisation
    db.ts        Firestore reads and writes
    dbOps.ts     Batched operations (e.g. deleting a habit and its history)
    storage.ts   Image upload with validation and resizing
    *.test.ts    Unit tests
firestore.rules  Security rules for the database
storage.rules    Security rules for file storage
firebase.json    Hosting (single-page-app rewrite) and rules configuration
```

---

## Data model

Cloud Firestore keeps each user's data in their own subtree:

```
/users/{userId}                                   profile: displayName, avatarUrl, timezone,
                                                  theme, remindersEnabled, createdAt, updatedAt
/users/{userId}/habits/{habitId}                  name, description, icon, imageUrl,
                                                  reminderTime, sortOrder, createdAt, archivedAt
/users/{userId}/habits/{habitId}/completions/{YYYY-MM-DD}
                                                  userId, habitId, completionDate, createdAt
```

Design choices:
- **A completion's document ID is its date.** This guarantees at most one completion per habit per day and makes marking, undoing and lookups simple.
- **Completions live under their habit.** Habits can never share data, which matches the one-calendar-per-habit rule.
- Completions are loaded in pages of 500, so habits with more than 1,000 completed days still load fully.
- Deleting a habit first deletes its completions in batches, because Firestore does not delete sub-collections automatically.

---

## Security

Security rules are written in `firestore.rules` and `storage.rules`:

- Everything is **denied by default**.
- Only the signed-in owner can read or write anything under `/users/{theirId}/**`.
- Fields are allow-listed, with type and size checks (for example, habit names are 1 to 60 characters).
- Immutable fields such as `uid`, `userId` and `createdAt` cannot be changed.
- Completion IDs must be real calendar dates (leap years included) and cannot be more than one day ahead of the server date.
- Completions can only be created or deleted, never edited.
- Uploads are limited to JPEG, PNG or WebP files under 2 MB, in the user's own folder.
- Only public Firebase web configuration is in the client. No service-account keys or secrets belong in this repository.

> The 30-active-habit limit is enforced in the app, because Firestore rules cannot count documents.

---

## Getting started

### Prerequisites
- Node.js 18 or newer
- A Firebase project

### Install and run

```bash
git clone <your-repository-url>
cd greenstrike
npm install
cp .env.example .env     # then fill in your Firebase values
npm run dev
```

Open the local URL that Vite prints.

---

## Firebase setup

1. **Create a Firebase project** and add a Web app. Copy its config into your `.env` (or the config file the project uses).
2. **Enable Authentication**: Authentication → Sign-in method → turn on **Google** and **Email/Password**.
3. **Create the Firestore database** and publish `firestore.rules`.
4. **Add your domain**: Authentication → Settings → Authorized domains → add your deployed domain. Google sign-in fails on unlisted domains.
5. **(Optional) Cloud Storage**: needed only for custom avatar and cover uploads. It may require the Blaze (pay-as-you-go) plan. Publish `storage.rules` after enabling it. Without it, GREENSTRIKE falls back to small inline images.
6. **Test the rules** in Firestore → Rules → Rules Playground:
   - Another user cannot read, create, update or delete your habits or completions.
   - An unauthenticated user cannot read or write anything.
   - A completion at `/users/{uid}/habits/{id}/completions/2026-02-31` is denied.
   - A habit with a 61-character name is denied.
   - A habit with an unknown extra field is denied.

---

## Scripts and testing

```bash
npm run dev       # start the development server
npm run build     # type-check and create the production build
npm run lint      # TypeScript type check (tsc --noEmit)

# unit tests
npx tsx --test src/lib/dates.test.ts src/lib/greenstrike.test.ts
```

The test suite covers:
- Current and longest streaks, including gaps and the "today not done yet" case
- Year boundaries, the 2028 leap day and daylight-saving transitions
- Monday-first week grid and month-label spacing
- Timezone differences around the date line
- Completion percentage, including the zero-habit case
- Isolation between two habits' completions and cache keys
- Pagination over 1,500 completions
- Batched habit deletion over 950 completions
- Optimistic toggle rollback, double-click protection and midnight rollover
- Image validation limits

---

## Deployment

```bash
npm run build
firebase deploy
```

`firebase.json` serves `dist/` and rewrites every route to `index.html`, so refreshing on `/dashboard` or `/habits/:id` works. After deploying, add the live domain to Firebase **Authorized domains**.

---

## Design system

Premium, calm and nature-inspired, in the spirit of editorial design studios. Dark mode is the default.

| Token | Dark | Light |
|---|---|---|
| Background | `#0C1410` | `#F7F4EC` (warm ivory) |
| Card | `#17241C` | `#FFFFFF` |
| Emerald | `#16834A` | `#16834A` |
| Completed square | `#35D879` | `#16834A` |
| Empty square | `#252F29` | `#E6EAE4` |
| Primary text | `#F4F6F1` | `#12261B` |
| Gold accent | `#C7A66A` | darker gold for contrast |

Typography pairs **Geist** for the interface with **Instrument Serif** for large editorial headlines. Gold is used sparingly, as a luxury accent only. Motion is smooth and restrained: opacity and small vertical movement, short durations, and full support for reduced-motion preferences.

---

## Design principles

1. **Simple first.** Create, show up, mark complete, see a green dot.
2. **One habit, one calendar.** Never combined.
3. **Honest data.** No fake history, no random dots, no seeded habits. New users see a real empty state.
4. **Calendars are the hero.** Photos, type and motion support them without overpowering them.
5. **Respect the user.** Accessible by keyboard and screen reader, readable contrast, comfortable touch targets, and reduced motion honoured.
6. **Correct dates.** One timezone-safe source of truth for every date calculation.

---

## What GREENSTRIKE is not

Not a task manager, a social network, a gamified points system or an analytics dashboard. There are no categories, leaderboards, badges or intensity levels. Reminders appear only while the app is open, and there are no emails or push notifications.

---

**GREENSTRIKE** · SHOW UP. MARK YOUR DAY. BUILD CONSISTENCY.
*Created by Nikhil Jeeva.*
