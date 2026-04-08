# Summary

## What I built

A product spec (`spec.md`) and a working clickable demo (`meridian-disruption-console.html`) for what I'm calling the **"Disruption Console"** (that name will definitely need to be worked on) — an AI-assisted recovery surface that sits within Meridian's existing collaboration tool. When a machine goes down, a component arrives late, or a part fails test, it surfaces 2–3 recovery options that respect DPAS hierarchy, explains the tradeoffs in plain English, and auto-drafts the DPAS-compliant customer notification once the planner accepts a choice.

The demo is a single self-contained HTML file — double-click to open, no install, no server. It ships with three disruption scenarios (CNC fault, late component, failed test → rework), each with structured recommendations, a confirmation modal before commit, a visible Gantt reschedule on accept, an auto-drafted customer notification with real 15 CFR §700.13(d) language, and a timestamped audit trail.

## Key tradeoffs

**1. Recovery over prediction.** I deprioritized predictive failure detection. Reliable prediction requires labeled sensor data most customers lack, and acting on low-trust predictions introduces risk early.

Focusing on recovery:
- Solves an immediate, high-frequency pain point
- Builds planner trust through deterministic outcomes
- Creates a data foundation for future predictive features

Prediction becomes a Phase 2 opportunity once sufficient MES event history exists.

**2. Solver-led scheduling, LLM-led explanation.** I avoided using an LLM to generate schedules directly. Defense scheduling involves hard constraints (DPAS compliance), where invalid outputs are unacceptable.

Instead:
- A deterministic solver ensures all recommendations are feasible
- The LLM generates explanations, tradeoffs, and communication

This maintains system correctness while improving usability and decision speed.

**3. Scoped to planner workflow (not team coordination).** I intentionally excluded broader collaboration features (e.g., notifying internal teams), focusing on the core scheduling recovery loop. This keeps the feature tightly aligned to the primary user problem.

## How I used AI

I built this through iterative collaboration with Claude, where direction mattered more than prompting.

**What worked:**
- **Problem-first framing.** I started with research (DPAS, AS9100, delivery constraints) before designing solutions, which shaped the feature around real operational constraints. Specific clause numbers (§700.13(d), the one-working-day notification window, DX > DO > unrated) came directly out of that research and went straight into the spec and the demo's auto-drafted customer notification.
- **Iterative refinement.** Each section went through multiple passes, forcing clarity and tradeoff articulation.
- **Tradeoff-driven design.** I explicitly used Claude as a thinking partner for alternatives and risks at each step.
- **Visual sketching with Figma Make.** I'm a visual thinker, so before any of the spec work I used Figma Make to sketch early solution directions for myself — just to see the shapes of the problem in UI before writing anything down.

**What didn't:**
- Initial demo passes are usually generic until I provide a clear product and UX direction.
- I changed demo formats mid-process (HTML → React → HTML), which introduced avoidable rework. Honestly that was partly the nerd in me wanting the React version too.

**Key takeaway:** AI accelerated synthesis and execution, but all critical product decisions required human judgment.

## What I'd do differently with more time

- **Actually interview a planner.** Every OTD and recovery-time number in the spec is extrapolated from industry sources via Claude's research. A real interview with one or two planners at a Tier 1 supplier would either validate the problem framing or blow it up.
- **Design the unhappy paths.** The spec and demo both assume the happy case where the solver returns feasible options. I didn't design what happens when it returns zero feasible options (every path violates DPAS or the contractual window), or when two planners try to approve overlapping changes at the same time. These are the edge cases that break trust fastest in real usage.
- **Build the reprompt flow for real.** The "give me different options" escape hatch is mocked as an alert. In production it's one of the most interesting LLM surfaces — the planner types a constraint hint in plain English ("no overtime this week", "don't touch the Lockheed program") and the system re-runs.
- **Manager-only mode for cost data inputs (v2).** Right now the cost figures on each recommendation card (`~$840 · CNC-1 evening`, `~$3,200 · weekend`) are magic numbers — the demo doesn't explain where they come from. A manager-only mode where leadership inputs the team roster, hourly rates, OT multipliers, and labor cost rules would give those numbers a real source and cleanly separate concerns: planners use the recovery flow, managers configure the inputs.
- **Agentic scheduling for a beta cohort + critical edge cases (v2.5).** Once recovery is trusted, the natural progression is moving from "AI assists the planner on every disruption" to "AI handles routine recoveries autonomously, planner reviews after the fact, edge cases still escalate to a human." A beta cohort of 2–3 design-partner planners would be the right place to test this — start with the smallest, lowest-risk disruption types (e.g. unrated commercial slips) and expand the autonomy envelope only as trust accumulates.

## The hard question I'd want answered before shipping

**Do we actually understand DPAS and its operating environment well enough to build this responsibly?**

Everything in the spec rests on a research-grade reading of 15 CFR Part 700. That's a starting point, not a foundation. Before I'd feel comfortable putting this in front of a real planner running a real DX-rated program, I'd want to know:

- **What are the actual enforcement limits?** The regulation says rated orders get priority scheduling, but what's the real-world consequence of a missed rating — a DCMA corrective action request, a contract modification, a fine, or a career-ending finding for the planner personally? The severity determines how conservative the Console's guardrails need to be, and whether auto-execute is acceptable at all on DX-rated programs.
- **What's the actual rate of non-compliance today?** I described the status quo in the spec but I'm extrapolating. I want to know the real rate of DPAS non-compliance events, how DCMA handles them in practice, how often they're caused by good-faith re-sequencing errors versus systemic problems, and what the recovery process looks like for the planner who made the call.
- **What do planners do today when the schedule breaks?** The spec assumes 4–8 hours of Excel and phone calls. I need to see that happen in person — directly or indirectly — who they call first, what they write down, what they *don't* write down, and where the communications gaps show up. The Disruption Console is only useful if it fits into the real recovery workflow, not the one I imagined from a distance.
- **Are there laws I haven't found?** ITAR I caught. CMMC I caught. AS9100 I caught. But I'm a PM who spent one session reading the CFR. There are almost certainly state-level defense contracting rules, prime-specific flowdown clauses, and classified-program overlays that would constrain the feature in ways I don't know yet.
- **Is the data to support this even available?** The spec assumes MES event streams and structured work-order data. A lot of defense shops may still run on paper travelers and Excel. If the reference customer can't give us structured disruption history, every success metric in the spec just became a much harder challenge.
- **For engineering: can the solver + LLM hit a planner-acceptable latency budget — and can we run them inside an ITAR-controlled environment at all?** A planner staring at a disruption won't tolerate a 15-second wait for recommendations — trust erodes inside the first session if the tool feels slow. The realistic budget is something like 3 seconds to first option, 8 seconds to full panel. Hitting it under load (defense floors run hundreds of work orders) is non-trivial and probably requires streaming and template caching. Underneath the latency question is a deployment question: work-order details routinely include controlled technical data, so we can't call a public LLM API from a customer environment under ITAR. Bedrock GovCloud, Azure Government, or a self-hosted open-weights model in the customer's VPC are all options — each with different latency, cost, and model-quality profiles. If none fit the customer's security posture, the feature may not be shippable to that customer regardless of how good the spec is.

The most honest answer to "are we ready to ship" is that the spec and the demo prove the *shape* of the feature is right. They do not prove I understand the operating environment well enough to deploy it safely. Closing that gap is what Phase 1 (shadow mode with named design partners) is really for — and why the kill criteria exist.
