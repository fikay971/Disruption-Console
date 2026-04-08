# Meridian — Disruption Console

A working React prototype of an AI-assisted recovery feature for production planners at defense manufacturers. Built for the Meridian Production Systems take-home assignment.

See `../spec.md` for the product spec and `../summary.md` for build notes.

## Run locally

Requires Node.js 18+.

```bash
npm install
npm run dev
```

The app opens automatically at `http://localhost:5173`.

## Demo flow

The app loads with a live floor schedule on the left and an idle Disruption Console on the right.

**Trigger a disruption** with one of the three buttons at the top of the floor view, or with the keyboard:

- `1` — **CNC-2 fault** (the headline scenario; visually re-sequences the schedule on accept)
- `2` — **Late component** (supplier delay, ingested via supervisor manual entry)
- `3` — **Test failure** (FAI fail → MRB rework loop)
- `R` — **Reset** to the initial state

For each disruption, the Console surfaces three recovery options with structured tradeoffs (OTD impact, OT cost, DPAS posture, risk) and a plain-English rationale. The recommended option is highlighted.

**Click Accept on any option** to commit. The Console flips to a resolved view showing the auto-drafted DPAS-compliant customer notification and the audit trail. For the CNC scenario + Option B, the Gantt also visibly re-sequences (the affected DX work moves to CNC-1).

The two dashed buttons at the bottom — **Different options** and **Edit manually** — are the planner's escape hatches. They're mocked with explanatory dialogs in this demo.

## File layout

```
src/
  App.jsx        — single-file component tree (App, TopBar, Floor, Console, ...)
  mockData.js    — initial schedule + three disruption scenarios with all copy
  styles.css     — all styles, organized by section
  main.jsx       — React entry point
```

## What's mocked

- **No real LLM call.** The rationale prose for each recommendation is hand-written in `mockData.js`. In production, this is the output of an LLM that's been given the solver's feasible options and asked to explain them in a planner's voice.
- **No real solver.** The "feasible options" are pre-baked. In production, a constraint solver (or-tools, OptaPlanner, etc.) generates the feasible space and the LLM explains a curated subset.
- **No MES integration.** Disruptions are triggered by buttons. In production, they come from an MES event stream.

These mocks are deliberate. The demo's job is to make the *interaction shape* legible — what the planner sees, what they choose, what gets logged, what gets sent to the customer. The optimization math and the LLM wiring are well-trodden engineering work; the product question is what the human sees and how trust is earned.
