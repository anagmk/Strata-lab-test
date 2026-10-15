# Strata Lab (prototype v2)

Working-path prototype for a civil-engineering materials lab. No backend: everything is stored in the browser (`localStorage`, key `strata-lab.v1`). The app starts empty; there is no seeded dummy data.

## Run

```
npm install
npm run dev        # http://localhost:5173
npm run build
```

## The path

Project > Batch > Sample > Test > Readings > Review > Report > Overview

- Create a project, then a batch (material + grade), then a sample (gets an ID like `S-CUB-0001`).
- Start a test (Cube strength, Sieve analysis, Proctor, Crack width from photo). Enter readings; results and charts update live.
- "Fill example readings" is optional, for trying the app quickly.
- Submit for review. Switch role in the user menu to Engineer to approve or send back with a comment.
- Approved runs produce a printable report (drafts are watermarked).
- Overview KPIs, trend, coverage and flags are all computed from your data.

## Persistence

Data lives only in this browser. Settings > Export JSON / Import JSON to back up or move data. "Clear all" resets.

## Moving to a real backend

`src/lib/store.tsx` is the API boundary. Each action (addProject, addBatch, addSample, addRun, updateRun, submitRun, reviewRun, ...) maps to one REST call (Express + MongoDB). `src/lib/calc.ts` is pure and can move to the server unchanged. Types are in `src/lib/db.ts`.

## Caveats

- Acceptance rules are simplified (cube: mean >= fck+3, each >= fck-3; sieve zones per IS 383; Proctor quadratic fit). Verify against current IS codes.
- Flags are rule-based, not a trained model.
- Crack width from photo: you set the scale from a ruler in the photo and draw a line across the crack; edge snapping is plain image processing (half-depth of the dark band), not AI. Lines not at right angles to the crack read wide. Accuracy is about one pixel. Automatic crack detection would need a vision model on a backend.
- Only 4 of the 40 listed tests are live; the rest appear in the Test library as reference.
- "Strata Lab" is a placeholder name (`src/lib/config.ts`).

## Design

Tokens in `src/theme/theme.css` (light + graphite dark, 2px radius, hairline borders, mono tabular numerals, print CSS).
