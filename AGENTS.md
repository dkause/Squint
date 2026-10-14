# AGENTS.md

Guidance for coding agents working in this repository.

## What this is

SQUINT — a UX project transferred from Figma: a photo-selection PWA
("Tinder for portrait sessions") where photographer and client navigate
similar-looking images and pick the best one. The concept grew out of the
SILBERBLICK photo business (German for "squint"). Design source is the
interactive Figma prototype (link in `README.md`).

The repo holds the case study (README = full case study, BRD, images) and the
MVP application code (see `SPEC.md` and `TASKS.md`).

## Principles (from SPEC.md)

1. **Restraint:** Squint does little, and does it well. Anything that does not
   serve limit-selection and mobile use does not go in.
2. **Mobile-first:** thumb operation. Desktop must be usable (arrow keys,
   buttons) but gets no dedicated layout.
3. **Discreet, no SaaS:** one instance, one photographer, no accounts, no
   registration.
4. **Filenames are the interface** to the photographer's existing workflow.

## Non-goals (MVP) — never build these, not even "helpfully"

No customer login/account, no gallery/overview, no chat, no star rating, no
payment, no Capture-One plugin, no free-text customer input, no multi-tenancy,
no sharing/download. The authoritative list is in `SPEC.md`.

## Build & Dev

- Node.js ≥ 22, TypeScript, ESM. No frontend framework, no Tailwind — native
  CSS only.
- `npm run dev` — dev server (`tsx watch`), port from `PORT` env, default 8080.
- `npm start` — production launch command (also used on Infomaniak).
- Gates (must be green before merging to `dev`): `npm run typecheck`,
  `npm run lint`, `npm test`.
- `npm run deploy` — placeholder until T9 (Infomaniak Node.js hosting).

## Deployment target: Infomaniak

- Node.js site on shared web hosting (no VPS). Deploy via Git; the Manager
  runs the build command (`npm install && npm run build` — not yet used) and
  the launch command (`npm start`).
- The app **must** listen on `process.env.PORT`; the Manager assigns it
  dynamically.
- Custom env vars (upload password, SMTP credentials) are configured in the
  Manager's advanced settings, never in the repo.
- SMTP: `mail.infomaniak.com`, port 465 (SSL) or 587 (STARTTLS), user = full
  mail address.
- The running process may see a different filesystem than generic hosting
  SSH; verify write paths for `data/<token>/` at first deploy (T2 spike).

## Goals

1. **Case study on silberblick.net** — the German page is derived from this
   repo. Unwired drafts live at `../silberblick.net/_IA+Content/pages/squint.md`
   (2026-03-16, detailed) and `.../ux-case-study-squint.md` (2025-11-24,
   Double-Diamond framing). At integration: merge into one page based on
   `squint.md`, retire the other draft, copy needed images from `src/img/`,
   wire the page into `src/pages/`. This repo (EN) is the complete source.
2. **Test bed for agent / vibe coding** — the PWA gets built in this repo
   (stack: Node.js + TypeScript, vanilla frontend; see `SPEC.md`).

## Structure

- `README.md` — the full case study: problem, competitive/SWOT analysis, personas, LoFi→HiFi prototypes, moderated and remote usability testing, design system (Material Design 3 base, IBM Plex), Figma delivery. Treat it as content, not as a config index.
- `BusinessRequirementDoc.md` — BRD: target audience (B2B high-volume portrait photographers), competition, risks, scope (PWA + product website + blog), functional requirements (link-only login, proofing views, timeboxing, metadata sync, payment).
- `SPEC.md` — MVP spec: scope, state machine, data model, non-goals. Authoritative for implementation decisions.
- `TASKS.md` — ticket breakdown T0–T9 with merge order and green gates.
- `src/` — server code (TypeScript). `src/img/` holds the case-study images referenced by README and BRD.
- `public/` — client code (vanilla TS, native CSS).
- `src/img/` — all images referenced by README and BRD: contact sheet, personas, prototypes, heatmaps, design-system sheets, app screens, logo.

## Conventions

- Root conventions apply: see `../AGENTS.md` (lowercase-hyphen names, one sentence per file in the index).
- This repo's language is English; root-level docs are German — keep each file in its own language.
