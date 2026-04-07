// ============================================================================
// Mock data for the Disruption Console demo.
// In production, jobs come from the customer's MES (Opcenter, FactoryTalk, etc.)
// and recommendations come from a constraint solver + LLM rationale layer.
// ============================================================================

export const HOUR_START = 8;
export const HOUR_END = 20;
export const HOURS = HOUR_END - HOUR_START;

// Initial floor schedule. Designed so the CNC-2 fault scenario hits DX work
// in queue, forcing a visible DPAS-aware tradeoff.
export const initialJobs = [
  // CNC-1
  { id: 'WO-4470', resource: 'cnc1', start: 8,    dur: 2,   rating: 'do',      label: 'WO-4470 · DO-A1' },
  { id: 'WO-4488', resource: 'cnc1', start: 10,   dur: 2.5, rating: 'unrated', label: 'WO-4488' },
  { id: 'WO-4502', resource: 'cnc1', start: 12.5, dur: 2,   rating: 'unrated', label: 'WO-4502' },
  { id: 'WO-4510', resource: 'cnc1', start: 14.5, dur: 2,   rating: 'do',      label: 'WO-4510 · DO-A1' },

  // CNC-2 — fault scenario hits here
  { id: 'WO-4471', resource: 'cnc2', start: 8,    dur: 1.5, rating: 'do',      label: 'WO-4471 · DO-A1' },
  { id: 'WO-4485', resource: 'cnc2', start: 9.5,  dur: 2,   rating: 'dx',      label: 'WO-4485 · DX-A1' },
  { id: 'WO-4486', resource: 'cnc2', start: 11.5, dur: 2,   rating: 'dx',      label: 'WO-4486 · DX-A1' },
  { id: 'WO-4495', resource: 'cnc2', start: 13.5, dur: 2,   rating: 'do',      label: 'WO-4495 · DO-A3' },

  // TEST-1
  { id: 'WO-4460-T', resource: 'test1', start: 8.5,  dur: 1.5, rating: 'do',      label: 'WO-4460' },
  { id: 'WO-4470-T', resource: 'test1', start: 10.5, dur: 1.5, rating: 'do',      label: 'WO-4470' },
  { id: 'WO-4471-T', resource: 'test1', start: 12,   dur: 1.5, rating: 'do',      label: 'WO-4471' },
  { id: 'WO-4485-T', resource: 'test1', start: 14,   dur: 1.5, rating: 'dx',      label: 'WO-4485' },

  // TEST-2
  { id: 'WO-4458-T', resource: 'test2', start: 8,    dur: 2,   rating: 'unrated', label: 'WO-4458' },
  { id: 'WO-4488-T', resource: 'test2', start: 13.5, dur: 1.5, rating: 'unrated', label: 'WO-4488' },
  { id: 'WO-4486-T', resource: 'test2', start: 15,   dur: 1.5, rating: 'dx',      label: 'WO-4486' },

  // PACK & SHIP — the bottleneck
  { id: 'WO-4458-P', resource: 'pack', start: 10.5, dur: 1, rating: 'unrated', label: 'WO-4458' },
  { id: 'WO-4460-P', resource: 'pack', start: 11.5, dur: 1, rating: 'do',      label: 'WO-4460' },
  { id: 'WO-4470-P', resource: 'pack', start: 12.5, dur: 1, rating: 'do',      label: 'WO-4470' },
  { id: 'WO-4471-P', resource: 'pack', start: 14,   dur: 1, rating: 'do',      label: 'WO-4471' },
  { id: 'WO-4485-P', resource: 'pack', start: 15.5, dur: 1, rating: 'dx',      label: 'WO-4485' },
  { id: 'WO-4486-P', resource: 'pack', start: 16.5, dur: 1, rating: 'dx',      label: 'WO-4486' },
];

// ============================================================================
// Disruption scenarios
// In production these come from MES events, supervisor input, or email parsing.
// Each scenario has: a banner, three recommendations, and an "accept" effect
// describing how the schedule should mutate when an option is chosen.
// ============================================================================

export const scenarios = {
  cnc: {
    id: 'cnc',
    severity: 'danger',
    banner: {
      label: '⚠ Disruption detected · 09:14:22',
      title: 'CNC-2 fault — spindle overtemperature (E-237)',
      meta: [
        ['Source', 'MES event stream'],
        ['ETA back online', '~14:00 (4.7 hrs)'],
      ],
      affected: '3 work orders · 2 DX-rated · 1 DO-rated',
    },
    recommendations: [
      {
        id: 'A',
        title: 'A · Hold and wait for CNC-2 recovery',
        recommended: false,
        summary: 'Pause the CNC-2 queue and resume when the spindle is repaired (~14:00). No re-sequencing. Two DX-rated orders slip ~5 hours, breaching their contractual delivery window.',
        fields: [
          { label: 'OTD Impact',    value: '−2 DX rated late',  tone: 'danger' },
          { label: 'OT Cost',       value: '$0',                tone: 'ok' },
          { label: 'DPAS Posture',  value: 'At risk · §700.14', tone: 'danger' },
          { label: 'Notifications', value: '2 required',        tone: 'warn' },
        ],
      },
      {
        id: 'B',
        title: 'B · Reroute DX work to CNC-1, defer commercial',
        recommended: true,
        summary: 'Move WO-4485 and WO-4486 (both DX-A1) onto CNC-1 starting 10:00. Push WO-4502 (unrated commercial) from Tuesday to Thursday. All rated orders ship on contractual date; one commercial order slips two days with no LD exposure.',
        fields: [
          { label: 'OTD Impact',      value: 'All rated on time',  tone: 'ok' },
          { label: 'OT Cost',         value: '~$840 · CNC-1 eve',  tone: 'warn' },
          { label: 'DPAS Posture',    value: 'Compliant',          tone: 'ok' },
          { label: 'CNC-1 Util',      value: '94% · low slack',    tone: 'warn' },
        ],
      },
      {
        id: 'C',
        title: 'C · Reroute DX work, add Saturday shift',
        recommended: false,
        summary: 'Same DX rerouting as Option B, but cover the displaced commercial work with a Saturday shift instead of slipping it. Highest cost; preserves the commercial customer relationship and CNC-1 slack.',
        fields: [
          { label: 'OTD Impact',    value: 'All orders on time', tone: 'ok' },
          { label: 'OT Cost',       value: '~$3,200 · weekend',  tone: 'danger' },
          { label: 'DPAS Posture',  value: 'Compliant',          tone: 'ok' },
          { label: 'Notifications', value: 'None required',      tone: 'ok' },
        ],
      },
    ],
    notification: `Subject: DPAS Notification — WO-4502 Delivery Reschedule

To: procurement@northstar-systems.com
From: m.reyes@meridian-aero.com
Cc: dcma-quality@meridian-aero.com
Date: 14 May, 09:18

Per 15 CFR §700.13(d), Meridian Plant 04 is providing notice that
work order WO-4502 (PO #NS-22441), originally committed for delivery
14 May, will now ship 16 May.

Reason: Unscheduled CNC-2 maintenance event on 14 May at 09:14
required reallocation of manufacturing capacity. Higher-rated work
on the same line was preserved per DPAS hierarchy.

New committed ship date: 16 May, end of day.

This verbal-equivalent notification will be followed by written
confirmation within one working day per §700.13(d)(2). Please
acknowledge receipt at your convenience.

— M. Reyes, Production Planning, Meridian Plant 04`,
    audit: [
      ['09:14:22', 'Disruption detected', 'MES event · CNC-2 spindle overtemp E-237'],
      ['09:14:38', 'Solver returned', '17 feasible options · DPAS hierarchy enforced'],
      ['09:14:51', '3 options surfaced', 'A (hold), B (reroute), C (Saturday shift)'],
      ['09:16:41', 'Option {OPT} accepted', 'by M. Reyes · auto-execute initiated'],
      ['09:16:42', 'Schedule committed', 'to MES · floor displays updated · notification drafted'],
    ],
  },

  latePart: {
    id: 'latePart',
    severity: 'warn',
    banner: {
      label: '⚠ Disruption detected · 09:42:08',
      title: 'Titanium stock for WO-4495 — supplier delay 48 hrs',
      meta: [
        ['Source', 'Supervisor manual entry'],
        ['New ETA', 'Thursday 16 May, 0800'],
      ],
      affected: '1 DO-rated work order, downstream queue impact',
    },
    recommendations: [
      {
        id: 'A',
        title: 'A · Backfill CNC-2 with WO-4520 from Wednesday',
        recommended: true,
        summary: 'Pull WO-4520 (DO-A3, currently scheduled Wednesday 0800) forward into the CNC-2 slot freed by the late titanium. Push WO-4495 to Thursday when the stock arrives. Net delivery impact: zero — both orders still ship within contractual windows.',
        fields: [
          { label: 'OTD Impact',    value: 'No slip',       tone: 'ok' },
          { label: 'OT Cost',       value: '$0',            tone: 'ok' },
          { label: 'DPAS Posture',  value: 'Compliant',     tone: 'ok' },
          { label: 'Notifications', value: 'None required', tone: 'ok' },
        ],
      },
      {
        id: 'B',
        title: 'B · Run unrated commercial fill-in',
        recommended: false,
        summary: 'Use the CNC-2 idle window for WO-4530 (unrated, normally next week). Keeps the machine warm but doesn\'t help on-time delivery for any rated work.',
        fields: [
          { label: 'OTD Impact',      value: 'Neutral',    tone: 'warn' },
          { label: 'OT Cost',         value: '$0',         tone: 'ok' },
          { label: 'DPAS Posture',    value: 'Compliant',  tone: 'ok' },
          { label: 'Util Gain',       value: '+8 hrs',     tone: 'ok' },
        ],
      },
      {
        id: 'C',
        title: 'C · Hold the slot for CNC-2 maintenance',
        recommended: false,
        summary: 'Use the unexpected gap for the CNC-2 preventive maintenance window currently scheduled for next Friday. Buys back floor capacity later in the week.',
        fields: [
          { label: 'OTD Impact',   value: 'Neutral now',         tone: 'ok' },
          { label: 'OT Cost',      value: '$0',                  tone: 'ok' },
          { label: 'DPAS Posture', value: 'Compliant',           tone: 'ok' },
          { label: 'Side benefit', value: 'Avoids future PM',    tone: 'ok' },
        ],
      },
    ],
    notification: `Subject: DPAS Notification — WO-4495 Delivery Reschedule

To: procurement@raytheon-supply.com
From: m.reyes@meridian-aero.com
Cc: dcma-quality@meridian-aero.com
Date: 14 May, 09:46

Per 15 CFR §700.13(d), Meridian Plant 04 is providing notice that
work order WO-4495 (DO-A3, PO #RTX-88102) will ship on the original
contractual date despite an upstream titanium stock delay.

Reason: Supplier reported 48-hour delay on raw titanium for this
work order. Production capacity has been reallocated to backfill
the affected slot; no schedule impact to your delivery commitment.

Committed ship date: unchanged.

This is a courtesy notification — no action required on your end.

— M. Reyes, Production Planning, Meridian Plant 04`,
    audit: [
      ['09:42:08', 'Disruption logged', 'Supervisor entry · LLM-parsed to structured event'],
      ['09:42:21', 'Solver returned', '9 feasible options · DPAS hierarchy enforced'],
      ['09:42:33', '3 options surfaced', 'A (backfill), B (commercial fill), C (PM swap)'],
      ['09:43:15', 'Option {OPT} accepted', 'by M. Reyes · auto-execute initiated'],
      ['09:43:16', 'Schedule committed', 'to MES · supplier flagged for follow-up'],
    ],
  },

  testFail: {
    id: 'testFail',
    severity: 'warn',
    banner: {
      label: '⚠ Disruption detected · 11:08:44',
      title: 'WO-4471 failed first-article inspection — rework required',
      meta: [
        ['Source', 'Test Station 1'],
        ['Defect', 'Bore tolerance · MRB hold'],
      ],
      affected: 'WO-4471 (DO-A1) re-enters CNC queue · downstream Pack/Ship slot freed',
    },
    recommendations: [
      {
        id: 'A',
        title: 'A · Expedite rework on CNC-1, slide WO-4488 to evening',
        recommended: true,
        summary: 'Insert WO-4471 rework into CNC-1 at 13:00 ahead of the unrated WO-4488. WO-4471 still ships Tuesday — one day late on the original commit but inside its contractual window. WO-4488 finishes after hours with light overtime.',
        fields: [
          { label: 'OTD Impact',    value: '+1d (in window)', tone: 'warn' },
          { label: 'OT Cost',       value: '~$420',           tone: 'warn' },
          { label: 'DPAS Posture',  value: 'Compliant',       tone: 'ok' },
          { label: 'MRB Required',  value: 'Yes · routed',    tone: 'warn' },
        ],
      },
      {
        id: 'B',
        title: 'B · Push WO-4471 to Wednesday morning',
        recommended: false,
        summary: 'Defer the rework to Wednesday\'s first CNC-2 slot. Cleaner sequencing, no overtime — but customer notification required and the order slips outside its preferred window (still inside contractual).',
        fields: [
          { label: 'OTD Impact',    value: '+2d',         tone: 'warn' },
          { label: 'OT Cost',       value: '$0',          tone: 'ok' },
          { label: 'DPAS Posture',  value: 'Compliant',   tone: 'ok' },
          { label: 'Notifications', value: '1 required',  tone: 'warn' },
        ],
      },
      {
        id: 'C',
        title: 'C · Scrap and re-issue from raw stock',
        recommended: false,
        summary: 'MRB disposition: scrap. Issue replacement from raw stock and run as a new work order. Highest impact and cost — recommended only if rework risk is unacceptable for this part class.',
        fields: [
          { label: 'OTD Impact',    value: '+4d',           tone: 'danger' },
          { label: 'Material Cost', value: '~$1,800',       tone: 'danger' },
          { label: 'DPAS Posture',  value: 'Notify reqd',   tone: 'warn' },
          { label: 'QA Path',       value: 'Full FAI',      tone: 'warn' },
        ],
      },
    ],
    notification: `Subject: DPAS Notification — WO-4471 Delivery Reschedule

To: procurement@lockheed-rotary.com
From: m.reyes@meridian-aero.com
Cc: dcma-quality@meridian-aero.com
Date: 14 May, 11:12

Per 15 CFR §700.13(d), Meridian Plant 04 is providing notice that
work order WO-4471 (DO-A1, PO #LM-44219), originally committed for
delivery 14 May, will now ship 15 May end of day.

Reason: Part failed first-article inspection on bore tolerance.
MRB-approved rework path has been initiated; the part will re-run
through manufacturing and re-test before shipment. New committed
date remains within the contractual delivery window.

This verbal-equivalent notification will be followed by written
confirmation within one working day per §700.13(d)(2).

— M. Reyes, Production Planning, Meridian Plant 04`,
    audit: [
      ['11:08:44', 'Disruption detected', 'Test Station 1 · FAI failure · bore tolerance'],
      ['11:08:51', 'Solver returned', '12 feasible options · MRB constraint applied'],
      ['11:09:02', '3 options surfaced', 'A (expedite rework), B (defer), C (scrap)'],
      ['11:10:18', 'Option {OPT} accepted', 'by M. Reyes · MRB routed to QA'],
      ['11:10:19', 'Schedule committed', 'to MES · QA notified · notification drafted'],
    ],
  },
};
