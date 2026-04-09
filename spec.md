# Disruption Console
### AI-assisted recovery for production planners at defense manufacturers

**For:** Meridian Production Systems — Product Design Challenge
**Status:** v1 spec, scoped for next-quarter release

> The Disruption Console focuses on the highest-frequency, highest-cost moment in the planner's workflow: when the schedule breaks.

---

## Problem statement

A production planner at a defense manufacturer manages hundreds of work orders flowing through a constrained floor (in Meridian's reference customer: 2 CNC, 2 test stations, 1 pack & ship). The schedule they publish on Monday morning is a fragile artifact. By Tuesday afternoon, three things have almost certainly happened:

- A CNC has gone down for unplanned maintenance.
- A raw component has slipped its delivery window.
- A part has failed test and needs to re-enter the manufacturing queue.

Each of these cascades. The single Pack & Ship station at end-of-line means any upstream slip eventually collides at the bottleneck, and a planner spends the rest of the day in Excel and the existing Gantt tool manually re-sequencing — calling the floor, calling suppliers, calling program managers, and trying to figure out which contractual delivery dates they can still hit.

**What makes this acutely painful in defense (and not just "factory scheduling"):**

- **DPAS is law.** Under 15 CFR 700, DX-rated orders take legal precedence over DO-rated, which take precedence over unrated. Delaying a higher-rated order to protect a lower-rated one is a violation, not a judgment call.
- **Customer notification is mandatory and time-bounded.** Any slip on a rated order must be communicated to the customer within one working day.
- **Every change needs an audit trail.** AS9100 and CMMC environments require traceability on who changed what, when, and why.

**Cost of the status quo, in concrete terms:**

- **Planner time:** 4–8 hours per disruption event re-sequencing the schedule, much of it spent re-typing the same information into Excel, the MES, and customer emails.
- **OTD impact:** Industry baselines for unaided defense scheduling cluster around 50–70% on-time delivery; purpose-built tools can lift this to 95%+. Each lost percentage point on a rated program is real LD exposure and reputation damage with the prime.

 The pain is that **recovery from disruption isn't a scheduling problem — it's a human-bandwidth problem**, and the human work is mostly comparing options, explaining tradeoffs, and writing notifications — exactly the work LLMs are now good at.

This feature targets reducing schedule recovery time from 4–8 hours to under 30 minutes for most disruption events, while improving DPAS compliance and on-time delivery rates.

---

## Primary user story

> **As a** production planner at a Tier 1 defense supplier,
> **when** the schedule breaks,
> **I want to** recover it in minutes instead of hours,
> **so that** every rated order still ships on its contractual date and I can defend every decision I made.

---

## Proposed feature: the Disruption Console

A new surface inside Meridian's existing planning tool that activates when a disruption occurs.

### Architecture

1. Event ingestion layer
2. Disruption normalization layer
3. Scheduling / solver layer
4. Policy / rules layer
5. Option-ranking and explanation layer
6. Planner UI / Disruption Console
7. Execution + audit layer

### Workflow

The Console does five things, in order, when a disruption hits:

### 1. Detect the disruption

Disruptions arrive through two paths: automated MES events (machine faults, state changes, test failures ingested directly from Siemens Opcenter, Rockwell FactoryTalk, iBase-t Solumina, etc.) and supervisor manual entry (free-text or Slack/Teams — "*titanium stock for PO-4471 slipped 2 days*" — parsed by the LLM into a structured event). Email parsing from suppliers is a fast-follow.

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

- **Schedule commits** to the planning system of record. Floor displays and work-order assignments update, with shop-floor instructions pushed to the supervisor.
- **DPAS-compliant customer notification is auto-drafted** for any rated order that will slip — reason, affected line items, new committed date, regulatory language template. Planner reviews and copies in one click(to be sent in exisitng emailing tool). The one-working-day DPAS window becomes trivial instead of a scramble.

Every disruption, every option shown, every planner decision, and every constraint hint is written to an **audit log** — first-class, not a footnote. It's what makes the feature defensible to DCMA and the training-data flywheel for improving ranking over time.

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
| **ITAR / data residency on the LLM call** | Work-order details routinely include controlled technical data. Sending that to a third-party LLM API hosted outside a controlled environment is a potential ITAR violation that would be a deal-breaker for primes. | (a) Deploy the LLM in-VPC or on-prem (Bedrock GovCloud, Azure Government, or a self-hosted open-weights model) — never call a public API from a customer environment. (b) Strip or tokenize controlled fields before they reach the model where possible. (c) Document the data flow as part of the customer's CMMC evidence package, not as an afterthought. |
| **LLM cost and latency at scale** | A planner managing hundreds of orders may trigger dozens of disruption events per week. If recommendations take 15+ seconds to render or the inference bill scales linearly with floor activity, planners route around the tool and unit economics break. | (a) Cache and reuse LLM rationale templates for common disruption patterns. (b) Stream the response so the planner sees the first option within 2 seconds even if the third is still generating. (c) Set a hard latency budget (target: first option ≤ 3s, full panel ≤ 8s) and monitor it as a top-line SLO. |
| **Solver and LLM disagree on what "good" means** | The solver optimizes a fixed objective function. The LLM's prose can imply a different value judgment ("preserves customer relationships"). When the math and the language disagree, planner trust erodes faster than from any single hallucination. | (a) The LLM is given the solver's objective function as part of its prompt and is instructed to explain options *in those terms*, not invent new ones. (b) Any "soft" tradeoff the LLM raises (relationship, morale, slack erosion) is labeled as such on the card so it's distinguishable from the deterministic fields. (c) Quarterly review with planners on whether the objective function still reflects how they actually rank options. |

---

## What I chose not to build (and why)

**Predictive failure detection** — an AI that watches MES sensor data to forecast machine failures *before* they happen. I deprioritized this for v1 for three overlapping reasons: the labeled sensor history needed to train it doesn't exist at most defense customers yet; asking planners to act on black-box predictions before they trust us on the easier problem (recovery) is the wrong order of operations; and even with perfect prediction, the Console is still the thing that generates and explains the options a planner acts on. Recovery is the foundation. Prediction is a strong v2 candidate once 6–12 months of MES data is flowing through the Console.

---

## Phased rollout

**Phase 1 — Shadow mode (weeks 1–4).** Deploy to Meridian's reference customer with 2–3 planners as named design partners. Console runs alongside the existing workflow: detects disruptions, generates options, drafts notifications — but does *not* auto-execute. Planners recover schedules manually while treating the Console as a second opinion. Goal: LLM recommendations match what experienced planners would have chosen ≥70% of the time. This is the trust-earning phase.

**Phase 2 — Assisted mode (weeks 5–8).** Auto-execute is enabled but defaults to "draft" — planner explicitly publishes after a one-click review. Customer notification auto-draft goes live. Audit log becomes the system of record for disruption recovery. Roll out to the full planning team at the reference site.

**Phase 3 — General availability (week 9+).** Auto-publish enabled by default with the 60-second undo window. Onboard the next 2–3 customers using the reference deployment as the template. Begin collecting MES event data systematically to set up the v2 predictive layer.

**Kill criteria.** If by end of Phase 1 the recommendation-match rate is below 50%, or if planners are routing around the Console more than 60% of the time, we stop and rethink rather than push to Phase 2. Trust is the gating signal, not the calendar.
