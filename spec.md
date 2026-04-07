# Disruption Console
### AI-assisted recovery for production planners at defense manufacturers

**For:** Meridian Production Systems — Product Design Challenge
**Status:** v1 spec, scoped for next-quarter release

---

## Problem statement

A production planner at a defense manufacturer manages hundreds of work orders flowing through a constrained floor (in Meridian's reference customer: 2 CNC, 2 test stations, 1 pack & ship). The schedule they publish on Monday morning is a fragile artifact. By Tuesday afternoon, three things have almost certainly happened:

- A CNC has gone down for unplanned maintenance.
- A raw component has slipped its delivery window.
- A part has failed test and needs to re-enter the manufacturing queue.

Each of these cascades. The single Pack & Ship station at end-of-line means any upstream slip eventually collides at the bottleneck, and a planner spends the rest of the day in Excel and the existing Gantt tool manually re-sequencing — calling the floor, calling suppliers, calling program managers, and trying to figure out which contractual delivery dates they can still hit.

**What makes this acutely painful in defense (and not just "factory scheduling"):**

1. **DPAS is law, not preference.** Under 15 CFR 700, DX-rated orders legally take precedence over DO-rated orders, which take precedence over unrated commercial work. Re-sequencing in a way that delays a higher-rated order to protect a lower-rated one is a DPAS violation, not just a bad call. DCMA audits this.
2. **Customer notification is mandatory and time-bounded.** When a rated order will slip, the contractor must notify the customer immediately with reason and new date — verbally followed by written confirmation within one working day. Today this is a manual email a planner writes between phone calls.
3. **Every change needs an audit trail.** AS9100 and CMMC environments require traceability on who changed what, when, and why. Planners reconstruct this from memory and Excel comments.

**Cost of the status quo, in concrete terms:**

- **Planner time:** 4–8 hours per disruption event recovering the schedule — much of it re-typing the same information into Excel, the MES, and customer emails.
- **OTD impact:** Industry baselines for unaided defense scheduling cluster around 50–70% on-time delivery; purpose-built tools can lift this to 95%+. Each lost percentage point on a rated program is real LD exposure and reputation damage with the prime.
- **Compliance risk:** Inconsistent or late customer notifications on rated orders are a documented DCMA finding. Recovery decisions made under time pressure occasionally get the DPAS hierarchy wrong, which is a corrective-action-request waiting to happen.
- **Cascade amplification:** Because re-sequencing is slow, planners often delay the decision, which means the next disruption hits before the first one is resolved. The schedule degrades faster than the planner can rebuild it.

The pain isn't that scheduling is hard — APS and constraint solvers have existed for 40 years and Meridian presumably already has one. The pain is that **recovery from disruption is a human-bandwidth problem**, and the human work is mostly comparing options, explaining tradeoffs, and writing notifications — exactly the work LLMs are now good at.

---

## Proposed feature: the Disruption Console

A new surface inside Meridian's existing planning tool that activates when a disruption occurs. It does five things, in order:

### 1. Detect the disruption

Three ingestion paths, in order of automation:

- **MES event stream (primary).** Machine faults, work-order state changes, and test failures stream in from the customer's MES (Siemens Opcenter, Rockwell FactoryTalk, iBase-t Solumina, etc.) over a standard event bus. CNC-2 going into FAULT state at 09:14 fires an event within seconds.
- **Supervisor manual entry (secondary).** A free-text field — or an integration with the customer's existing Slack/Teams channel — where a supervisor types "*Titanium stock for PO-4471 slipped 2 days, supplier called*." An LLM parses that into a structured disruption event (affected work orders, new ETA, reason code) and surfaces it for planner confirmation.
- **Email parsing (fast-follow).** Supplier delay emails get extracted into the same structured format. Out of scope for v1 to keep the surface area tight.

### 2. Generate the feasible recovery space (deterministic solver)

The existing constraint solver — not the LLM — generates the set of valid re-sequencing options. The solver enforces hard constraints that must never be violated:

- **DPAS hierarchy** (DX > DO > unrated). The solver will not propose any option that delays a higher-rated order to protect a lower-rated one.
- **Process dependencies** (Manufacturing → Test → Pack & Ship; rework loops back to Manufacturing).
- **Resource capacity** (2 CNC, 2 test, 1 pack/ship).
- **Crew and tooling availability** where modeled.

This is the guardrail. The LLM is never allowed to invent a schedule the solver hasn't blessed. If the solver says an option is infeasible, it doesn't exist.

### 3. Recommend 2–3 options, explained in plain English (LLM)

From the solver's feasible set, the LLM selects 2–3 options that represent meaningfully different tradeoffs and writes a planner-readable summary for each:

> **Option B — Recommended**
> Reroute the two DX-A1 orders queued behind CNC-2 onto CNC-1 starting at 10:00, and push the unrated commercial order #4502 from Wednesday to Friday.
> - **OTD impact:** All three rated orders still ship on contractual date. Order #4502 slips 2 days; not rated, no LD.
> - **Cost:** ~$800 in CNC-1 overtime (Tuesday evening).
> - **DPAS posture:** Compliant. No rated order is delayed in favor of an unrated one.
> - **Risk:** CNC-1 utilization climbs to 94% — low slack if anything else breaks this week.
> - **Notification required:** Yes, customer for #4502. Draft ready below.

The LLM is doing three things here that a solver alone cannot: **picking which options to surface from possibly hundreds of feasible ones**, **translating the math into language a planner can defend to a program manager**, and **flagging the human-judgment tradeoffs** (overtime cost, slack erosion, customer relationship impact) that aren't in the solver's objective function.

### 4. Planner decides — and stays in control

The planner has four actions on the recommendation panel:

- **Accept Option A / B / C** — one click. Schedule commits, work-order assignments update on the floor displays automatically, the audit log entry is written, and the customer notification draft (next step) opens for review.
- **None of these — give me different options.** Planner adds a constraint hint in plain English ("*no overtime this week*", "*don't touch the Lockheed program*", "*assume CNC-2 is back by 14:00*") and the solver/LLM re-runs.
- **None of these — let me do it manually.** Opens the full Gantt editor with the disruption highlighted. The Console steps out of the way completely. This escape hatch is non-negotiable: it's the trust unlock for skeptical planners and supervisors.
- **Defer.** Snooze for 15/30/60 minutes if the planner needs to call the floor before deciding.

The planner approves the **outcome**, not the math. They never have to trust that the AI's optimization is correct — only that the option they picked, written in plain English, matches their judgment.

### 5. Auto-execute on approval

Once the planner accepts an option:

- **Schedule commits** to the planning system of record. Floor displays and work-order assignments update.
- **DPAS-compliant customer notification is auto-drafted** for any rated order that will slip. Pulls reason, affected line items, new committed date, and the regulatory language template. Planner reviews, edits if needed, sends in one click. Written confirmation within the one-working-day DPAS window becomes trivial instead of a scramble.
- **Shop-floor instructions** are generated for the supervisor (e.g. "*Move WO-4471 and WO-4488 from CNC-2 queue to CNC-1. Tooling change at 10:00.*").
- **Audit log entry** captures: the disruption event, all options that were shown, which one was chosen, who approved it, when, and any constraint hints the planner provided. This is first-class — not a footnote — because it's what makes the feature defensible to DCMA and to the customer's quality team. It is also the training-data flywheel for improving option ranking over time.

---

## Primary user story

> **As a** production planner at a Tier 1 defense supplier,
> **when** a machine goes down, a part is late, or a test fails,
> **I want** to see 2–3 recovery options that respect DPAS and explain their tradeoffs in plain English,
> **so that** I can pick the best one in minutes instead of hours, with a clean audit trail and a customer notification already drafted.

---

## Success metrics

| Metric | Baseline (today) | v1 target | How we measure |
|---|---|---|---|
| **Schedule recovery time** (disruption detected → committed new schedule) | 4–8 hours | ≤ 30 minutes for 80% of events | Timestamp delta in audit log |
| **On-time delivery rate, rated orders** | Customer-specific; typically 70–85% | +5 percentage points within 6 months of rollout | Existing OTD reporting |
| **DPAS notification compliance** (rated-order slips notified within DPAS window) | Estimated 60–75% (manual, inconsistent) | ≥ 98% | Audit log vs. delivery date deltas |
| **Planner trust / adoption** | n/a | ≥ 70% of disruption events resolved via Console (vs. manual override) by month 3 | Console action telemetry |
| **Recommendation acceptance rate** | n/a | ≥ 50% of accepted recoveries are an LLM-recommended option (vs. "give me different" or manual) | Console action telemetry |

The trust/adoption metric matters as much as the speed metric. A perfect tool that planners route around is worth nothing.

---

## Key risks and mitigations

| Risk | Why it matters | Mitigation |
|---|---|---|
| **Planner doesn't trust the AI** and routes around the Console | Defense planners are deeply experienced and skeptical of black boxes. Without trust, the feature is shelfware. | (a) Solver — not LLM — owns feasibility, so options are mathematically valid by construction. (b) Plain-English rationale every time. (c) Always-available "let me do it manually" escape hatch. (d) Audit log shows reasoning. (e) Pilot with 2–3 hand-picked planners as design partners before broad rollout. |
| **LLM hallucinates a tradeoff or misreads a constraint** | A confidently wrong rationale ("this option is DPAS-compliant" when it isn't) is worse than no rationale. | (a) The LLM never decides feasibility — the solver does, and the LLM is constrained to talk about options the solver returned. (b) Structured fields (DPAS posture, OT cost, OTD impact) are computed deterministically and *displayed* by the LLM, not generated by it. The LLM only writes the surrounding prose. (c) Red-team the prompt with adversarial disruption scenarios before launch. |
| **Data availability — MES integration is messy at customer sites** | Many defense customers run a patchwork of legacy MES, paper travelers, and Excel. If we can't ingest disruptions reliably, the Console can't trigger. | (a) Ship with the supervisor manual-entry path on day one — Console is useful even with zero MES integration, just slower to detect. (b) Build standard connectors for the top 3 MES platforms (Opcenter, FactoryTalk, Solumina) before launch. (c) Partner closely with one reference customer for v1 and treat their integration as the template. |
| **DPAS rules get encoded wrong** | A wrong DPAS implementation isn't just a bug — it's a compliance violation that puts the customer in a DCMA finding. | (a) Have a defense-industry compliance SME review the rules engine before launch. (b) Hard-code DPAS as a solver constraint, not a soft preference, so it cannot be overridden by any LLM output or planner shortcut. (c) Surface the DPAS posture explicitly on every recommendation card so the planner can sanity-check. |
| **Shop-floor change management** | Supervisors who don't know "the machine just told the planner" may distrust the new instructions or feel surveilled. | (a) Brief supervisors before rollout — they're stakeholders, not bystanders. (b) Make supervisor manual entry a first-class input path so they're contributors, not subjects. (c) Show the audit trail on the floor display so the supervisor sees *why* the plan changed. |
| **Auto-execute commits a bad schedule** | A one-click accept that turns out to be wrong is hard to roll back once the floor has reacted. | (a) 60-second "undo" window on every accepted change before it propagates to floor displays. (b) Snapshot the prior schedule so a full revert is always one click. (c) For the first 90 days at any new customer, default the auto-execute to "draft mode" — planner explicitly publishes after review. |

---

## What we chose not to build (and why)

**Predictive failure detection** — i.e. an AI that watches MES sensor data and CNC vibration patterns to forecast a machine failure two hours before it happens, so the schedule can be re-sequenced *before* the disruption.

This is the most obvious adjacent feature and we deliberately deprioritized it for v1. Three reasons:

1. **Data we don't have.** Reliable failure prediction requires months to years of labeled sensor history per machine type, and most defense customers don't instrument their CNCs at the resolution needed. We'd be building a model on data that doesn't exist yet.
2. **Trust we haven't earned.** Asking a planner to act on a black-box prediction ("the model thinks CNC-2 will fail this afternoon") before they trust us on the easier problem ("CNC-2 just failed, here are your options") is the wrong order of operations. Recovery is a concrete, verifiable AI win. Prediction is an abstract one.
3. **It doesn't replace recovery — it adds to it.** Even with perfect prediction, you still need the Disruption Console to generate and explain the recovery options. Recovery is the foundation; prediction is a layer on top. Build the foundation first.

We expect predictive detection to be a strong v2 candidate once we have 6–12 months of MES event data flowing through the Console — at which point we'll have both the training data and the customer trust to make it land.

---

## Phased rollout

**Phase 0 — Design partnership (weeks 1–4).** Pick one reference customer. Two or three planners as named design partners. Shadow them through three real disruption events. Validate baseline OTD and recovery-time numbers against actual data, not industry estimates.

**Phase 1 — Shadow mode (weeks 5–8).** Console runs alongside the existing workflow. Detects disruptions, generates options, drafts notifications — but does not auto-execute. Planners use it as a "second opinion" while continuing to recover schedules manually. Goal: validate that LLM recommendations match what experienced planners would have chosen ≥70% of the time. This is the trust-earning phase.

**Phase 2 — Assisted mode (weeks 9–14).** Auto-execute is enabled but defaults to "draft" — planner explicitly publishes after a one-click review. Customer notification auto-draft goes live. Audit log becomes the system of record for disruption recovery. Roll out to the full planning team at the design-partner site.

**Phase 3 — General availability (week 15+).** Auto-publish enabled by default with the 60-second undo window. Onboard the next 2–3 customers using the design-partner deployment as the template. Begin collecting MES event data systematically to set up the v2 predictive layer.

**Kill criteria.** If by end of Phase 1 the recommendation-match rate is below 50%, or if planners are routing around the Console more than 60% of the time, we stop and rethink rather than push to Phase 2. The trust metric is the gating signal, not the calendar.

---

## Open questions for the v1 design partner

- What's the right number of recommended options? Two feels too constrained, four feels like a menu. Three is the default but should be tested.
- How aggressive should the LLM be about flagging tradeoffs the solver doesn't model (crew morale, customer-relationship history with a specific buyer)? Useful, but at risk of feeling presumptuous.
- Should the audit log be visible to the customer's program manager directly, or only to internal quality/compliance? Affects the tone and detail level of the LLM's rationale prose.
