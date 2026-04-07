import { useState, useEffect, useCallback } from 'react';
import { initialJobs, scenarios, HOUR_START, HOURS } from './mockData';

// ============================================================================
// Helpers
// ============================================================================
const pctLeft = (hour) => ((hour - HOUR_START) / HOURS) * 100;
const pctWidth = (dur) => (dur / HOURS) * 100;

// ============================================================================
// Top bar
// ============================================================================
function TopBar({ status }) {
  return (
    <div className="topbar">
      <div className="brand">
        <div className="brand-mark" />
        <div className="brand-name">MERIDIAN</div>
        <div className="brand-sub">/ Disruption Console</div>
      </div>
      <div className="topbar-meta">
        <div><span className="label">Site</span><span className="value">Plant 04 · Tucson</span></div>
        <div><span className="label">Planner</span><span className="value">M. Reyes</span></div>
        <div><span className="label">Shift</span><span className="value">Day · 0600–1800</span></div>
        <div>
          <span className={`status-dot ${status.dotClass}`} />
          <span className="value">{status.text}</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Floor / Gantt
// ============================================================================
const RESOURCES = [
  { id: 'cnc1',  name: 'CNC-1',      meta: 'Manufacturing' },
  { id: 'cnc2',  name: 'CNC-2',      meta: 'Manufacturing' },
  { id: 'test1', name: 'TEST-1',     meta: 'Verification' },
  { id: 'test2', name: 'TEST-2',     meta: 'Verification' },
  { id: 'pack',  name: 'PACK / SHIP', meta: 'Bottleneck' },
];

const HOURS_LABELS = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00'];

function Floor({ jobs, faultedResource, onTrigger, onReset }) {
  return (
    <div className="floor">
      <div className="floor-header">
        <div className="section-label">Production Floor / Tuesday 14 May</div>
        <div className="section-title">Live Schedule</div>
        <div className="floor-controls">
          <button className="trigger-btn" onClick={() => onTrigger('cnc')}>
            <span>Trigger: CNC-2 fault</span>
            <span className="key">1</span>
          </button>
          <button className="trigger-btn" onClick={() => onTrigger('latePart')}>
            <span>Trigger: Late component</span>
            <span className="key">2</span>
          </button>
          <button className="trigger-btn" onClick={() => onTrigger('testFail')}>
            <span>Trigger: Test failure</span>
            <span className="key">3</span>
          </button>
          <button className="trigger-btn reset" onClick={onReset}>
            Reset <span className="key">R</span>
          </button>
        </div>
      </div>

      <div className="gantt-wrap">
        <div className="gantt">
          <div />
          <div className="gantt-header">
            {HOURS_LABELS.map(h => <div key={h} className="hour">{h}</div>)}
          </div>

          {RESOURCES.map(r => {
            const isFault = faultedResource === r.id;
            return (
              <div key={r.id} className="gantt-row">
                <div className={`gantt-resource ${isFault ? 'fault' : ''}`}>
                  <div className="name">{r.name}</div>
                  <div className="meta">{isFault ? 'FAULT · E-237' : r.meta}</div>
                </div>
                <div className={`gantt-track ${isFault ? 'fault' : ''}`}>
                  {jobs.filter(j => j.resource === r.id).map((j, i) => (
                    <div
                      key={`${j.id}-${i}`}
                      className={`job ${j.rating} ${j.halted ? 'halted' : ''} ${j.rerouted ? 'rerouted' : ''}`}
                      style={{
                        left: `${pctLeft(j.start)}%`,
                        width: `${pctWidth(j.dur)}%`,
                      }}
                      title={j.label}
                    >
                      {j.label}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="legend">
        <div className="legend-item"><div className="legend-swatch dx" />DX rated</div>
        <div className="legend-item"><div className="legend-swatch do" />DO rated</div>
        <div className="legend-item"><div className="legend-swatch unrated" />Unrated / commercial</div>
        <div className="legend-item halted-legend"><div className="legend-swatch halted" />Halted</div>
      </div>
    </div>
  );
}

// ============================================================================
// Console — recommendations or resolved view
// ============================================================================
function RecommendationCard({ rec, onAccept }) {
  return (
    <div className={`rec-card ${rec.recommended ? 'recommended' : ''}`}>
      <div className="rec-header">
        <div className="rec-title">{rec.title}</div>
        {rec.recommended && <div className="rec-badge">★ Recommended</div>}
      </div>
      <div className="rec-summary">{rec.summary}</div>
      <div className="rec-fields">
        {rec.fields.map((f, i) => (
          <div key={i} className="rec-field">
            <div className="rec-field-label">{f.label}</div>
            <div className={`rec-field-value ${f.tone}`}>{f.value}</div>
          </div>
        ))}
      </div>
      <div className="rec-actions">
        {rec.recommended ? (
          <button className="btn primary" onClick={() => onAccept(rec.id)}>
            Accept · Auto-execute
          </button>
        ) : (
          <button className="btn" onClick={() => onAccept(rec.id)}>Accept</button>
        )}
      </div>
    </div>
  );
}

function DisruptionView({ scenario, onAccept, onReprompt, onManual }) {
  const { banner, recommendations, severity } = scenario;
  const bannerClass = severity === 'danger' ? 'disruption-banner danger' : 'disruption-banner warn';

  return (
    <>
      <div className={bannerClass}>
        <div className="disruption-label">{banner.label}</div>
        <div className="disruption-title">{banner.title}</div>
        <div className="disruption-meta">
          {banner.meta.map(([k, v], i) => (
            <span key={i}><strong>{k}:</strong> {v}</span>
          ))}
        </div>
        <div className="disruption-meta affected">
          <span><strong>Affected:</strong> {banner.affected}</span>
        </div>
      </div>

      <div className="recs-label">Recommended recovery options · 3</div>

      {recommendations.map(rec => (
        <RecommendationCard key={rec.id} rec={rec} onAccept={onAccept} />
      ))}

      <div className="escape-actions">
        <button className="escape-btn" onClick={onReprompt}>Different options →</button>
        <button className="escape-btn" onClick={onManual}>Edit manually →</button>
      </div>
    </>
  );
}

function ResolvedView({ scenario, acceptedOption }) {
  const audit = scenario.audit.map(([time, action, detail]) => [
    time,
    action.replace('{OPT}', acceptedOption),
    detail,
  ]);

  return (
    <>
      <div className="resolved-banner">
        <div className="resolved-label">✓ Recovery committed</div>
        <div className="resolved-title">Option {acceptedOption} accepted · auto-executing</div>
        <div className="disruption-meta">
          <span><strong>Approved by:</strong> M. Reyes</span>
          <span><strong>Undo window:</strong> 58s</span>
        </div>
      </div>

      <div className="notification-card">
        <div className="notification-header">
          <div className="notification-title">Customer notification — auto-drafted</div>
          <div className="notification-pill">DPAS §700.13(d)</div>
        </div>
        <pre className="notification-body">{scenario.notification}</pre>
        <div className="notification-actions">
          <button
            className="btn primary"
            onClick={() => alert('Notification sent. Written confirmation queued for the one-working-day window.')}
          >
            Review & send
          </button>
          <button
            className="btn"
            onClick={() => alert('Draft saved to outbox.')}
          >
            Save draft
          </button>
        </div>
      </div>

      <div className="audit-log">
        <div className="audit-title">▸ Audit trail — this disruption</div>
        {audit.map(([time, action, detail], i) => (
          <div key={i} className="audit-entry">
            <div className="audit-time">{time}</div>
            <div className="audit-action"><strong>{action}</strong> · {detail}</div>
          </div>
        ))}
      </div>
    </>
  );
}

function IdleState() {
  return (
    <div className="idle-state">
      <div className="idle-icon">◯</div>
      <div className="idle-title">No active disruptions</div>
      <div className="idle-sub">Console will activate on detection</div>
    </div>
  );
}

function Console({ scenario, view, acceptedOption, onAccept, onReprompt, onManual, status }) {
  return (
    <div className="console">
      <div className="console-header">
        <div className="section-label">Disruption Console</div>
        <div className="section-title">Recovery Recommendations</div>
        <div className="console-status">
          <span className={`status-dot ${status.dotClass}`} />
          <span>{status.text}</span>
        </div>
      </div>
      <div className="console-body">
        {view === 'idle' && <IdleState />}
        {view === 'disruption' && scenario && (
          <DisruptionView
            scenario={scenario}
            onAccept={onAccept}
            onReprompt={onReprompt}
            onManual={onManual}
          />
        )}
        {view === 'resolved' && scenario && (
          <ResolvedView scenario={scenario} acceptedOption={acceptedOption} />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// App — owns the state machine
// ============================================================================
const STATUS_NOMINAL = { dotClass: '',       text: 'All systems nominal · monitoring MES event stream' };
const STATUS_FAULT   = { dotClass: 'danger', text: 'CNC-2 FAULT — disruption detected' };
const STATUS_WARN    = { dotClass: 'warn',   text: 'Disruption detected — awaiting planner decision' };
const STATUS_COMMIT  = { dotClass: 'warn',   text: 'Schedule committing · 60s undo window' };
const STATUS_DONE    = { dotClass: '',       text: 'Recovery committed · all systems nominal' };

export default function App() {
  const [jobs, setJobs] = useState(initialJobs);
  const [view, setView] = useState('idle'); // idle | disruption | resolved
  const [activeScenarioId, setActiveScenarioId] = useState(null);
  const [acceptedOption, setAcceptedOption] = useState(null);
  const [faultedResource, setFaultedResource] = useState(null);
  const [status, setStatus] = useState(STATUS_NOMINAL);

  const activeScenario = activeScenarioId ? scenarios[activeScenarioId] : null;

  const reset = useCallback(() => {
    setJobs(initialJobs.map(j => ({ ...j })));
    setView('idle');
    setActiveScenarioId(null);
    setAcceptedOption(null);
    setFaultedResource(null);
    setStatus(STATUS_NOMINAL);
  }, []);

  const trigger = useCallback((scenarioId) => {
    // Soft reset before triggering a new scenario
    setJobs(initialJobs.map(j => ({ ...j })));
    setAcceptedOption(null);
    setActiveScenarioId(scenarioId);
    setView('disruption');

    if (scenarioId === 'cnc') {
      setFaultedResource('cnc2');
      setStatus(STATUS_FAULT);
      // Visually halt the DX job currently running on CNC-2
      setJobs(prev => prev.map(j => {
        if (j.id === 'WO-4485' && j.resource === 'cnc2') {
          return { ...j, halted: true, dur: 0.3 };
        }
        return j;
      }));
    } else {
      setFaultedResource(null);
      setStatus(STATUS_WARN);
    }
  }, []);

  const accept = useCallback((optionId) => {
    setAcceptedOption(optionId);

    // Apply the visual reschedule for the CNC scenario, option B (the headliner)
    if (activeScenarioId === 'cnc' && optionId === 'B') {
      setJobs(prev => {
        // Remove the rerouted DX work from CNC-2 and the displaced commercial from CNC-1
        const filtered = prev.filter(j =>
          !((j.id === 'WO-4485' || j.id === 'WO-4486') && j.resource === 'cnc2') &&
          !(j.id === 'WO-4502' && j.resource === 'cnc1')
        );
        // Add the rerouted jobs onto CNC-1
        const rerouted = [
          { id: 'WO-4485', resource: 'cnc1', start: 12.5, dur: 2, rating: 'dx', label: 'WO-4485 · DX-A1', rerouted: true },
          { id: 'WO-4486', resource: 'cnc1', start: 16.5, dur: 2, rating: 'dx', label: 'WO-4486 · DX-A1', rerouted: true },
        ];
        // Bump WO-4510 later on CNC-1
        return [...filtered, ...rerouted].map(j =>
          j.id === 'WO-4510' && j.resource === 'cnc1' ? { ...j, start: 14.5 } : j
        );
      });
    }

    setStatus(STATUS_COMMIT);
    setView('resolved');
    setTimeout(() => setStatus(STATUS_DONE), 2000);
  }, [activeScenarioId]);

  const reprompt = () => alert(
    'Reprompt flow:\n\n' +
    'In production, this opens a constraint hint field where the planner types ' +
    'a refinement in plain English ("no overtime this week", "do not touch the ' +
    'Lockheed program", etc.). The solver and LLM re-run with the new constraint ' +
    'and surface a fresh set of options.\n\nMocked for the demo.'
  );

  const manual = () => alert(
    'Manual mode:\n\n' +
    'In production, this collapses the Console panel and opens the full Gantt ' +
    'editor with the disruption highlighted. The planner is in complete control ' +
    '— the AI steps out of the way entirely.\n\n' +
    'This escape hatch is the trust unlock. It is non-negotiable.\n\nMocked for the demo.'
  );

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '1') trigger('cnc');
      if (e.key === '2') trigger('latePart');
      if (e.key === '3') trigger('testFail');
      if (e.key === 'r' || e.key === 'R') reset();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [trigger, reset]);

  return (
    <>
      <TopBar status={status} />
      <div className="app">
        <Floor
          jobs={jobs}
          faultedResource={faultedResource}
          onTrigger={trigger}
          onReset={reset}
        />
        <Console
          scenario={activeScenario}
          view={view}
          acceptedOption={acceptedOption}
          onAccept={accept}
          onReprompt={reprompt}
          onManual={manual}
          status={status}
        />
      </div>
    </>
  );
}
