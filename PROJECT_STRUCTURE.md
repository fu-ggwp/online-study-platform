# Smart Quiz Platform — Full Project Structure Guide

Based on the layered architecture diagram (Client → Server → Feature → Supabase/External Services)
and the SRS (54 use cases, 16 ERD entities, ~70 screens). Each backend "feature" follows the
diagram's chain: **route → middleware → controller → service → repository (DAO) → model → DB**.
Each frontend route follows: **page → frontend service → Supabase / backend API**.

Feature domains are grouped from the SRS's 9 functional areas + AI as a cross-cutting concern:

`auth · profiles · classes · question-banks · study-sets · exams · analytics · payments · admin · ai`

---

## FRONTEND — `client/src/`

```
client/src/
├── app/                                  # Next.js App Router — maps 1:1 to your route list
│   ├── layout.js
│   ├── page.js                           # / (landing, public)
│   ├── search/page.jsx                   # /search
│   ├── study-sets/[id]/page.jsx          # /study-sets/:id
│   ├── study-sets/[id]/flashcards/page.jsx
│   ├── users/[username]/page.jsx         # /users/:username
│   ├── plans/page.jsx                    # /plans
│   │
│   ├── (auth)/
│   │   ├── register/page.jsx
│   │   ├── login/page.jsx
│   │   ├── forgot-password/page.jsx
│   │   └── reset-password/page.jsx
│   │
│   ├── profile/
│   │   ├── page.jsx
│   │   ├── edit/page.jsx
│   │   ├── change-password/page.jsx
│   │   └── notifications/page.jsx
│   ├── upgrade/
│   │   ├── page.jsx
│   │   └── result/page.jsx
│   │
│   ├── learner/
│   │   ├── dashboard/page.jsx
│   │   ├── classes/
│   │   │   ├── page.jsx
│   │   │   ├── join/page.jsx
│   │   │   └── [id]/page.jsx
│   │   ├── study-sets/
│   │   │   ├── page.jsx
│   │   │   └── [id]/
│   │   │       ├── page.jsx
│   │   │       ├── flashcards/page.jsx
│   │   │       ├── quiz/page.jsx
│   │   │       └── quiz/result/page.jsx
│   │   ├── exams/
│   │   │   ├── page.jsx
│   │   │   └── [id]/
│   │   │       ├── page.jsx
│   │   │       ├── take/page.jsx
│   │   │       └── result/page.jsx
│   │   └── progress/page.jsx
│   │
│   ├── teacher/
│   │   ├── dashboard/page.jsx
│   │   ├── classes/
│   │   │   ├── page.jsx                  # ← "view created/managed classes"
│   │   │   ├── create/page.jsx
│   │   │   └── [id]/
│   │   │       ├── page.jsx
│   │   │       ├── members/page.jsx
│   │   │       └── invite/page.jsx
│   │   ├── question-banks/
│   │   │   ├── page.jsx
│   │   │   ├── create/page.jsx
│   │   │   └── [id]/
│   │   │       ├── page.jsx
│   │   │       ├── edit/page.jsx
│   │   │       ├── generate/page.jsx
│   │   │       └── questions/
│   │   │           ├── add/page.jsx
│   │   │           ├── import/page.jsx
│   │   │           ├── import/errors/page.jsx
│   │   │           ├── preview/page.jsx
│   │   │           └── [qid]/edit/page.jsx
│   │   ├── study-sets/
│   │   │   ├── page.jsx
│   │   │   ├── create/page.jsx
│   │   │   └── [id]/
│   │   │       ├── page.jsx
│   │   │       └── assign/page.jsx
│   │   ├── exams/
│   │   │   ├── page.jsx
│   │   │   ├── create/page.jsx
│   │   │   └── [id]/
│   │   │       ├── page.jsx
│   │   │       ├── settings/page.jsx
│   │   │       └── monitor/page.jsx
│   │   └── analytics/
│   │       ├── page.jsx
│   │       └── export/page.jsx
│   │
│   ├── admin/
│   │   ├── dashboard/page.jsx
│   │   ├── users/
│   │   │   ├── page.jsx
│   │   │   └── [id]/page.jsx
│   │   ├── resources/page.jsx
│   │   └── system-status/page.jsx
│   │
│   ├── 403/page.jsx
│   └── not-found.jsx                     # Next.js convention for /404
│
├── components/                           # "Components (shadcn, Nextjs)" in the diagram
│   ├── ui/                               # shadcn primitives (button.jsx, input.jsx, dialog.jsx…)
│   ├── landing/
│   ├── auth/
│   ├── profile/
│   ├── classes/
│   ├── question-banks/
│   ├── study-sets/
│   ├── exams/
│   ├── analytics/
│   ├── payments/
│   └── admin/
│
├── hooks/                                # "Hooks (React Hooks)" in the diagram
│   ├── use-auth.js
│   ├── use-classes.js
│   ├── use-study-sets.js
│   ├── use-exams.js
│   └── ...one per feature domain as needed
│
├── services/                             # "Frontend Services (Nextjs: xyzService)" — calls backend API
│   ├── api-client.js                     # axios instance with base URL + auth header
│   ├── auth.service.js
│   ├── profile.service.js
│   ├── classes.service.js
│   ├── question-banks.service.js
│   ├── study-sets.service.js
│   ├── exams.service.js
│   ├── analytics.service.js
│   └── payments.service.js
│
├── lib/
│   ├── supabaseClient.js                 # already exists
│   └── utils.js                          # cn(), formatters, etc.
│
├── utils/supabase/                       # already exists — client.js, server.js, middleware.js
│
└── middleware.js                         # already exists — session refresh
```

---

## BACKEND — `server/src/` (feature-first)

Each feature gets its own self-contained folder with route, controller, service, and DAO
(the diagram's chain: route → controller → service → DAO → DB). Two adjustments from before:

- **Models live outside the features**, in one shared `models/` directory — since model files are
  plain data-shape definitions tied to ERD entities (and some entities, like `Question`, are read
  by multiple features), keeping them in one place avoids duplication and cross-feature imports.
- **`repository` → `dao`**, matching the diagram's "Feature Repository (Express: xyz.dao)" naming.

```
server/src/
├── app.js                                # Express app + global middleware (already exists)
├── index.js                              # entry point (already exists)
│
├── config/
│   ├── supabase.js                       # already exists (anon + admin clients)
│   └── env.js                            # centralizes/validates process.env
│
├── middlewares/                          # cross-cutting "Middleware Layer" — shared by all features
│   ├── auth.middleware.js                # verifies Supabase JWT, attaches req.user
│   ├── role.middleware.js                # requireRole("teacher" | "admin" | ...)
│   ├── error.middleware.js               # centralized error handler
│   └── validate.middleware.js            # request body/schema validation (zod)
│
├── routes/
│   └── index.js                          # imports each feature's router, mounts on the app
│
├── models/                               # ALL entity models — shared across features (16 ERD entities)
│   ├── profile.model.js
│   ├── class.model.js
│   ├── join-request.model.js
│   ├── question-bank.model.js
│   ├── question.model.js
│   ├── answer-option.model.js
│   ├── study-set.model.js
│   ├── practice-session.model.js
│   ├── learner-answer.model.js
│   ├── exam.model.js
│   ├── exam-attempt.model.js
│   ├── report.model.js
│   ├── payment.model.js
│   ├── premium-plan.model.js
│   └── ai-interaction.model.js
│
├── features/
│   │
│   ├── health/                           # already exists, can be moved in here
│   │   ├── health.routes.js
│   │   └── health.controller.js
│   │
│   ├── auth/
│   │   ├── auth.routes.js
│   │   ├── auth.controller.js
│   │   ├── auth.service.js
│   │   └── auth.dao.js
│   │
│   ├── profiles/
│   │   ├── profiles.routes.js
│   │   ├── profiles.controller.js
│   │   ├── profiles.service.js
│   │   └── profiles.dao.js
│   │
│   ├── classes/
│   │   ├── classes.routes.js
│   │   ├── classes.controller.js         # ← "teacher views/manages classes" lives here
│   │   ├── classes.service.js
│   │   └── classes.dao.js
│   │
│   ├── question-banks/
│   │   ├── question-banks.routes.js
│   │   ├── question-banks.controller.js
│   │   ├── question-banks.service.js
│   │   └── question-banks.dao.js
│   │
│   ├── study-sets/
│   │   ├── study-sets.routes.js
│   │   ├── study-sets.controller.js
│   │   ├── study-sets.service.js
│   │   └── study-sets.dao.js
│   │
│   ├── exams/
│   │   ├── exams.routes.js
│   │   ├── exams.controller.js
│   │   ├── exams.service.js
│   │   └── exams.dao.js
│   │
│   ├── analytics/
│   │   ├── analytics.routes.js
│   │   ├── analytics.controller.js
│   │   ├── analytics.service.js
│   │   └── analytics.dao.js
│   │
│   ├── payments/
│   │   ├── payments.routes.js
│   │   ├── payments.controller.js
│   │   ├── payments.service.js
│   │   ├── payments.dao.js
│   │   └── payment-gateway.service.js    # Stripe / VNPAY integration
│   │
│   ├── admin/
│   │   ├── admin.routes.js
│   │   ├── admin.controller.js
│   │   ├── admin.service.js
│   │   └── admin.dao.js
│   │
│   └── ai/                               # cross-cutting feature consumed by other features
│       └── ai.service.js                 # Gemini API integration (model lives in /models)
│
└── utils/
    ├── async-handler.js                  # wraps controllers to forward errors
    ├── api-response.js                   # consistent { ok, data, error } shape
    ├── pagination.js
    ├── logger.js
    └── email.service.js                  # Brevo integration (shared, e.g. used by auth + classes)
```

**Why this split:** routing/controller/service/DAO are *behavior* tied to one feature, so they stay
grouped together for easy navigation. Models are *data shape*, often shared across features (e.g.
`Question` is read by both `question-banks` and `study-sets`/`exams`) — centralizing them in
`models/` avoids duplicate definitions and awkward cross-feature imports.

---

## What's already there vs. what needs building

**Already scaffolded:** `client/src/utils/supabase/*`, `client/src/middleware.js`,
`client/src/lib/supabaseClient.js`, `server/src/app.js`, `server/src/config/supabase.js`,
`server/src/routes/health.routes.js` + `health.controller.js`.

**Everything else above is empty/missing** — including, critically, the **database schema itself**
(no tables exist yet). The realistic build order is:

1. **Database schema + RLS policies** in Supabase (profiles, classes, question banks, study sets,
   exams, payments, etc. — the 16 ERD entities)
2. **Auth feature** (register/login/profile + role handling) — almost everything else depends on
   knowing who the current user is and what role they have
3. **Classes feature** (since it's the organizing unit for learners/teachers)
4. **Question banks → study sets → exams** (in that dependency order, since each builds on the last)
5. **Analytics, payments, admin** (these consume data produced by the above)

Each feature, once you reach it, gets the same five files on the backend (route, controller,
service, repository, model) plus the corresponding pages/components/services on the frontend —
so the first feature you build essentially becomes the template for all the rest.
