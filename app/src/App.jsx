import { useEffect, useState } from "react";

const sample = `Caller: We're on North Ridge, close to the old quarry path. My friend slipped from a ledge and landed below me. I can see him and he's talking, but he says his leg is badly hurt and he can't stand. The slope is very steep and there are loose rocks. It will be dark in about an hour. We came up from the east car park, but I don't know the grid reference. No other services are here.`;

const icons = { confirmed: "✓", uncertain: "~", unknown: "?" };

function rankTeam(team) {
  const availability =
    team.status === "available" ? 30 : team.status === "standby" ? 18 : 0;
  const capability = 25;
  const response = Math.max(0, 20 - Math.round(team.etaMinutes / 3));
  return Math.min(100, availability + capability + response);
}

function App() {
  const [transcript, setTranscript] = useState(sample);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [configured, setConfigured] = useState(false);
  const [selected, setSelected] = useState(null);
  const [teamPool, setTeamPool] = useState([]);
  const [expandedTeamId, setExpandedTeamId] = useState(null);
  const [showAllTeams, setShowAllTeams] = useState(false);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((x) => setConfigured(x.aiConfigured))
      .catch(() => {});

    fetch("/api/teams")
      .then((r) => r.json())
      .then((x) => {
        const ranked = [...(x.teams || [])].sort(
          (a, b) => rankTeam(b) - rankTeam(a) || a.etaMinutes - b.etaMinutes,
        );
        setTeamPool(ranked);
      })
      .catch(() => setTeamPool([]));
  }, []);

  async function analyse() {
    setLoading(true);
    setError("");
    setSelected(null);
    try {
      const response = await fetch("/api/analyse", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Analysis failed");
      setResult(body);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const rankedTeams = result?.matches ?? teamPool;
  const visibleTeams = showAllTeams ? rankedTeams : rankedTeams.slice(0, 5);
  const hasMoreTeams = rankedTeams.length > 5;

  return (
    <div className="shell">
      <header>
        <div className="brand">
          <span className="mark">N</span>
          <div>
            <strong>Northstar</strong>
            <small>Search & rescue coordination</small>
          </div>
        </div>
        <div className="status">
          <span className={configured ? "dot live" : "dot"} />
          {configured ? "Claude connected" : "Demo analysis mode"}
        </div>
        <div className="operator">
          <span>DC</span>
          <div>
            <strong>Dispatcher console</strong>
            <small>Trial environment</small>
          </div>
        </div>
      </header>

      <main>
        <section className="intro">
          <div>
            <p className="eyebrow">INCIDENT WORKSPACE · DRAFT</p>
          </div>
          <div className="safety">
            Decision support only
            <br />
            <span>No team is dispatched automatically</span>
          </div>
        </section>

        <div className="layout">
          <section className="panel transcript-panel">
            <div className="panel-head">
              <div>
                <span className="step">01</span>
                <h2>Caller transcript</h2>
              </div>
              <span className="badge neutral">SIMULATED CALL</span>
            </div>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              aria-label="Caller transcript"
            />
            <div className="transcript-foot">
              <span>
                {transcript.length} characters · transcript is not stored
              </span>
              <button type="button" onClick={analyse} disabled={loading}>
                {loading ? (
                  <>
                    <i className="spinner" />
                    Analysing call…
                  </>
                ) : (
                  "Analyse incident →"
                )}
              </button>
            </div>
            {error && <div className="error">{error}</div>}
          </section>

          <section className="panel picture-panel">
            <div className="panel-head">
              <div>
                <span className="step">02</span>
                <h2>Incident picture</h2>
              </div>
              {result && (
                <span className={`badge ${result.incident.mode}`}>
                  {result.incident.mode === "live"
                    ? "CLAUDE DRAFT"
                    : "LOCAL DEMO DRAFT"}
                </span>
              )}
            </div>
            {!result ? (
              <Empty text="Analyse the call to build a structured incident picture." />
            ) : (
              <>
                <p className="summary">{result.incident.summary}</p>
                <div className="facts">
                  {result.incident.fields.map((field) => (
                    <div className="fact" key={field.key}>
                      <span className={`confidence ${field.confidence}`}>
                        {icons[field.confidence]}
                      </span>
                      <div>
                        <small>{field.label}</small>
                        <strong>{field.value}</strong>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="questions">
                  <h3>
                    Ask next{" "}
                    <span>{result.incident.suggestedQuestions.length}</span>
                  </h3>
                  {result.incident.suggestedQuestions.map((q, i) => (
                    <div className="question" key={q}>
                      <b>{String(i + 1).padStart(2, "0")}</b>
                      <span>{q}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>

          <aside className="panel teams-panel">
            <div className="panel-head">
              <div>
                <span className="step">03</span>
                <h2>Available teams</h2>
              </div>
              <span className="muted">Ranked by fit</span>
            </div>
            {!rankedTeams.length ? (
              <Empty
                text="Team suitability will appear after incident analysis."
                compact
              />
            ) : (
              <div className="team-list">
                {visibleTeams.map((team, index) => {
                  const score =
                    typeof team.score === "number"
                      ? team.score
                      : rankTeam(team);
                  const reasons =
                    team.reasons ??
                    (team.capabilities || [])
                      .slice(0, 3)
                      .map((cap) => `Has ${cap}`);
                  const limits =
                    team.limits ??
                    (team.status === "tasked"
                      ? ["Currently assigned to another incident"]
                      : []);
                  const isExpanded =
                    expandedTeamId === (team.id ?? `${team.name}-${index}`);

                  return (
                    <article
                      className={`team ${index === 0 ? "recommended" : ""} ${isExpanded ? "expanded" : ""}`}
                      key={team.id ?? `${team.name}-${index}`}
                    >
                      <div className="team-summary">
                        <div className="team-name-block">
                          <span className="rank">0{index + 1}</span>
                          <div>
                            <div className="team-title-row">
                              <h3>{team.name}</h3>
                              <button
                                type="button"
                                className="select-button"
                                onClick={() =>
                                  setSelected(
                                    team.id ?? `${team.name}-${index}`,
                                  )
                                }
                              >
                                {selected ===
                                (team.id ?? `${team.name}-${index}`)
                                  ? "Selected ✓"
                                  : "Select"}
                              </button>
                              <button
                                type="button"
                                className="detail-toggle"
                                aria-label={
                                  isExpanded
                                    ? `Collapse details for ${team.name}`
                                    : `Expand details for ${team.name}`
                                }
                                aria-expanded={isExpanded}
                                onClick={() =>
                                  setExpandedTeamId(
                                    isExpanded
                                      ? null
                                      : (team.id ?? `${team.name}-${index}`),
                                  )
                                }
                              >
                                <span className="detail-toggle-icon" />
                              </button>
                            </div>
                            <p>
                              {team.area} · {team.people} responders
                            </p>
                          </div>
                        </div>
                        <div className="score">
                          <strong>{score}</strong>
                          <small>FIT</small>
                        </div>
                      </div>

                      <div className="team-status-row">
                        <span className={`availability ${team.status}`}>
                          {team.status}
                        </span>
                        <strong>{team.etaMinutes} min</strong>
                      </div>

                      <div
                        className={`team-details ${isExpanded ? "expanded" : ""}`}
                      >
                        <div className="reason-list">
                          {reasons.slice(0, 3).map((x) => (
                            <p key={x}>
                              <span>✓</span>
                              {x}
                            </p>
                          ))}
                          {limits.slice(0, 2).map((x) => (
                            <p className="limit" key={x}>
                              <span>!</span>
                              {x}
                            </p>
                          ))}
                        </div>
                        <div className="equipment">
                          {(team.equipment || []).map((x) => (
                            <span key={x}>{x}</span>
                          ))}
                        </div>
                      </div>
                    </article>
                  );
                })}

                {hasMoreTeams && (
                  <button
                    type="button"
                    className="view-all-btn"
                    onClick={() => setShowAllTeams((current) => !current)}
                  >
                    {showAllTeams ? "Show top 5" : "View all teams"}
                  </button>
                )}
              </div>
            )}
            {selected && (
              <div className="selection-note">
                Selection recorded in this screen only. Confirm through your
                organisation’s normal dispatch process.
              </div>
            )}
          </aside>
        </div>
      </main>
      <footer>
        <span>TRIAL 0.1</span>
        <p>
          AI-assisted draft · Verify all details with the caller and operational
          sources.
        </p>
      </footer>
    </div>
  );
}

function Empty({ text, compact = false }) {
  return (
    <div className={`empty ${compact ? "compact" : ""}`}>
      <div className="radar">
        <i />
        <i />
        <i />
      </div>
      <p>{text}</p>
    </div>
  );
}

export default App;
