# AGENTS.md

Guidance for coding agents working in this repository.

## What this is

SQUINT — a UX project transferred from Figma: a photo-selection PWA
("Tinder for portrait sessions") where photographer and client navigate
similar-looking images and pick the best one. The concept grew out of the
SILBERBLICK photo business (German for "squint"). Design source is the
interactive Figma prototype (link in `README.md`).

The repo currently holds **documentation only — no application code**
(README = full case study, BRD, images). App code will be added — see Goals.

## Goals

1. **Case study on silberblick.net** — the German page is derived from this
   repo. Unwired drafts live at `../silberblick.net/_IA+Content/pages/squint.md`
   (2026-03-16, detailed) and `.../ux-case-study-squint.md` (2025-11-24,
   Double-Diamond framing). At integration: merge into one page based on
   `squint.md`, retire the other draft, copy needed images from `src/img/`,
   wire the page into `src/pages/`. This repo (EN) is the complete source.
2. **Test bed for agent / vibe coding** — the PWA gets built in this repo
   (stack TBD; the BRD specifies a Progressive Web App). When coding starts,
   this file gains Build/Dev sections per root conventions.

## Structure

- `README.md` — the full case study: problem, competitive/SWOT analysis, personas, LoFi→HiFi prototypes, moderated and remote usability testing, design system (Material Design 3 base, IBM Plex), Figma delivery. Treat it as content, not as a config index.
- `BusinessRequirementDoc.md` — BRD: target audience (B2B high-volume portrait photographers), competition, risks, scope (PWA + product website + blog), functional requirements (link-only login, proofing views, timeboxing, metadata sync, payment).
- `src/img/` — all images referenced by README and BRD: contact sheet, personas, prototypes, heatmaps, design-system sheets, app screens, logo.

## Conventions

- Root conventions apply: see `../AGENTS.md` (lowercase-hyphen names, one sentence per file in the index).
- This repo's language is English; root-level docs are German — keep each file in its own language.
