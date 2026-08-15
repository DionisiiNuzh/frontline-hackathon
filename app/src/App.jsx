import { lazy, Suspense, useEffect, useRef, useState } from "react";
import TranscriptPanel from "./TranscriptPanel.jsx";

const MapPanel = lazy(() => import("./MapPanel.jsx"));

const icons = { confirmed: "✓", uncertain: "~", unknown: "?" };
const statusOrder = { available: 0, standby: 1, tasked: 2 };
const incidentPictureFieldOrder = [
  "incidentType",
  "exactLocation",
  "hazards",
  "access",
  "casualties",
  "services",
];

function getField(fields, key) {
  return fields?.find((field) => field.key === key);
}

function buildMethaneMessage(incident, team) {
  if (!incident) return "";

  const value = (key) => getField(incident.fields, key)?.value || "Not established";

  return [
    `M - Major incident: ${value("majorIncident")}`,
    `E - Exact location: ${value("exactLocation")}`,
    `T - Type of incident: ${value("incidentType")}`,
    `H - Hazards: ${value("hazards")}`,
    `A - Access: ${value("access")}`,
    `N - Number of casualties: ${value("casualties")}`,
    `E - Emergency services: ${team ? `${team.name} selected · ${team.etaMinutes} min ETA · Contact ${team.contact}` : value("services")}`,
  ].join("\n");
}

function sortRoster(teams) {
  return [...teams].sort(
    (a, b) =>
      (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3) ||
      a.etaMinutes - b.etaMinutes,
  );
}

function App() {
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [teamPool, setTeamPool] = useState([]);
  const [expandedTeamId, setExpandedTeamId] = useState(null);
  const [showAllTeams, setShowAllTeams] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");
  const [audioName, setAudioName] = useState("");
  const [interim, setInterim] = useState("");
  const [callStatus, setCallStatus] = useState("ready");
  const [dispatchSent, setDispatchSent] = useState(false);
  const audioRef = useRef(null);
  const socketRef = useRef(null);
  const recorderRef = useRef(null);
  const transcriptRef = useRef("");
  const revisionRef = useRef(0);
  const analysisControllerRef = useRef(null);
  const responseRef = useRef(null);

  useEffect(() => {
    fetch("/api/teams")
      .then((response) => response.json())
      .then(({ teams = [] }) => setTeamPool(sortRoster(teams)))
      .catch(() => setTeamPool([]));

    return () => {
      socketRef.current?.close();
      analysisControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  async function analyse(nextTranscript, revision) {
    if (nextTranscript.trim().length < 20) return;

    analysisControllerRef.current?.abort();
    const controller = new AbortController();
    analysisControllerRef.current = controller;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/analyse", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ transcript: nextTranscript }),
        signal: controller.signal,
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Analysis failed");
      if (revision !== revisionRef.current) return;

      setResult(body);
      setSelected((current) =>
        current && body.matches.some((team) => team.id === current) ? current : null,
      );
    } catch (err) {
      if (err.name !== "AbortError" && revision === revisionRef.current) {
        setError(err.message);
      }
    } finally {
      if (analysisControllerRef.current === controller) {
        analysisControllerRef.current = null;
      }
      if (revision === revisionRef.current) setLoading(false);
    }
  }

  function resetIncident(reason, fileName) {
    analysisControllerRef.current?.abort();
    analysisControllerRef.current = null;
    revisionRef.current += 1;
    transcriptRef.current = "";
    setTranscript("");
    setInterim("");
    setResult(null);
    setSelected(null);
    setExpandedTeamId(null);
    setShowAllTeams(false);
    setDispatchSent(false);
    setLoading(false);
    setError("");
    console.info("[transcript] cleared", { reason, file: fileName });
  }

  function chooseAudio(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    socketRef.current?.close();
    setAudioUrl(URL.createObjectURL(file));
    setAudioName(file.name);
    setCallStatus("ready");
    resetIncident("new audio selected", file.name);
  }

  function startCall() {
    const audio = audioRef.current;
    if (!audioUrl || !audio) return;
    const capture = audio.captureStream || audio.mozCaptureStream;
    if (!capture) {
      setError(
        "This browser cannot stream audio-element playback. Use Chrome or Chromium for this trial.",
      );
      return;
    }

    resetIncident("call started", audioName);
    setCallStatus("connecting");
    audio.currentTime = 0;

    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${protocol}//${location.host}/api/transcribe`);
    socketRef.current = socket;
    socket.onmessage = async ({ data }) => {
      const event = JSON.parse(data);
      console.log("[transcription] browser event", event);

      if (event.type === "ready") {
        try {
          const stream = capture.call(audio);
          const mimeType = [
            "audio/webm;codecs=opus",
            "audio/webm",
            "audio/ogg;codecs=opus",
          ].find((type) => MediaRecorder.isTypeSupported(type));
          const recorder = new MediaRecorder(
            stream,
            mimeType ? { mimeType } : undefined,
          );
          recorderRef.current = recorder;
          recorder.ondataavailable = async ({ data: chunk }) => {
            if (chunk.size && socket.readyState === WebSocket.OPEN) {
              socket.send(await chunk.arrayBuffer());
            }
          };
          recorder.onstop = () => {
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({ type: "finish" }));
            }
          };
          recorder.start(250);
          await audio.play();
          setCallStatus("playing");
        } catch (err) {
          setError(err.message || "Audio playback could not start.");
          setCallStatus("error");
          socket.close();
        }
      }

      if (event.type === "interim") {
        const nextInterim = event.isFinal ? "" : event.text;
        console.log("[transcript] interim update", {
          isFinal: event.isFinal,
          text: nextInterim,
        });
        setInterim(nextInterim);
      }

      if (event.type === "final") {
        const previous = transcriptRef.current;
        const next = [previous, event.text].filter(Boolean).join("\n");
        transcriptRef.current = next;
        console.info("[transcript] finalized segment appended", {
          received: event.text,
          previous,
          next,
          segmentCount: next.split("\n").length,
        });
        setTranscript(next);
        setInterim("");
        const revision = ++revisionRef.current;
        analyse(next, revision);
      }

      if (event.type === "error") {
        setError(event.message);
        setCallStatus("error");
      }
      if (event.type === "closed") setCallStatus("complete");
    };
    socket.onerror = () => {
      setError("Could not connect to live transcription.");
      setCallStatus("error");
    };
  }

  function finishCall() {
    audioRef.current?.pause();
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    setCallStatus("finishing");
  }

  function sendDispatch() {
    if (!result) return;
    setDispatchSent(true);
    window.setTimeout(() => responseRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  const hasAnalysis = Boolean(result);
  const rankedTeams = result?.matches ?? teamPool;
  const visibleTeams = showAllTeams ? rankedTeams : rankedTeams.slice(0, 5);
  const hasMoreTeams = rankedTeams.length > 5;
  const nextQuestions = result?.incident?.suggestedQuestions?.slice(0, 3) ?? [];
  const selectedTeam = result?.matches?.find((team) => team.id === selected);
  const methaneMessage = buildMethaneMessage(result?.incident, selectedTeam);
  const incidentPictureFields = incidentPictureFieldOrder
    .map((key) => getField(result?.incident?.fields, key))
    .filter(Boolean);
  return (
    <div className="shell">
      <header>
        <div className="brand">
          <span className="mark">R</span>
          <div>
            <strong>Relai</strong>
            <small>Search & rescue coordination</small>
          </div>
        </div>
      </header>

      <main>
        <div className="primary-layout">
          <TranscriptPanel
            audioName={audioName}
            audioRef={audioRef}
            audioUrl={audioUrl}
            callStatus={callStatus}
            error={error}
            interim={interim}
            loading={loading}
            onChooseAudio={chooseAudio}
            onFinishCall={finishCall}
            onStartCall={startCall}
            transcript={transcript}
          />

          <section className="panel picture-panel">
            <div className="panel-head">
              <div>
                <span className="step">02</span>
                <h2>Incident picture</h2>
              </div>
            </div>
            {!result ? (
              <Empty
                text={
                  loading
                    ? "Building the incident picture from the live transcript…"
                    : "Start the call to build a structured incident picture."
                }
              />
            ) : (
              <div className="picture-stack">
                <section className="ask-next" aria-label="Ask next" key={nextQuestions.join("|")}>
                  <div className="ask-next-label"><span>ASK NEXT</span><small>Recommended caller prompts</small></div>
                  <div className="question-grid">
                    {(nextQuestions.length ? nextQuestions : ["Confirm the caller’s exact location and current condition."]).map((question, index) =>
                      <div className={`next-question ${index === 0 ? "primary" : "secondary"}`} key={question}><b>{String(index + 1).padStart(2, "0")}</b><p>{question}</p></div>
                    )}
                  </div>
                </section>
                <section className="picture-block">
                  <div className="facts">
                    {incidentPictureFields.map((field) => (
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
                </section>

                <section className="picture-block dispatch-block">
                  <div className="picture-block-head">
                    <h3>Dispatch message</h3>
                    <span className={`badge ${selectedTeam ? "live" : "neutral"}`}>
                      {selectedTeam ? "READY TO SEND" : "SELECT TEAM"}
                    </span>
                  </div>
                  <pre className="dispatch-message">{methaneMessage}</pre>
                  <div className="dispatch-footer">
                    <span>
                      {selectedTeam
                        ? `${selectedTeam.name} · ${selectedTeam.contact}`
                        : "No rescue team selected yet"}
                    </span>
                    <button type="button" className="send-button" onClick={sendDispatch}>
                      Send message ↓
                    </button>
                  </div>
                </section>
              </div>
            )}
          </section>
        </div>

        <section className={`response-workspace ${dispatchSent ? "revealed" : ""}`} ref={responseRef}>
          <div className="section-intro">
            <div><p className="eyebrow">RESPONSE COORDINATION</p><h2>Teams & locations</h2></div>
            <span>Dispatch draft sent for review · No team automatically tasked</span>
          </div>
          <div className="response-layout">
            <aside className="panel teams-panel">
              <div className="panel-head">
                <div>
                  <span className="step">03</span>
                  <h2>{hasAnalysis ? "Suitable teams" : "Available teams"}</h2>
                </div>
              </div>
              {!rankedTeams.length ? (
                <Empty text="Loading the rescue-team roster…" compact />
              ) : (
                <div className="team-list">
                  {visibleTeams.map((team) => {
                    const reasons = team.reasons ?? [];
                    const limits = team.limits ?? [];
                    const isExpanded = expandedTeamId === team.id;
                    const isSelected = selected === team.id;

                    return (
                      <article
                        className={`team ${isSelected ? "selected" : ""} ${isExpanded ? "expanded" : ""}`}
                        key={team.id}
                      >
                        <div className="team-summary">
                          <div className="team-name-block">
                            <div>
                              <div className="team-title-row">
                                <h3>{team.name}</h3>
                                <button
                                  type="button"
                                  className="detail-toggle"
                                  aria-label={`${isExpanded ? "Collapse" : "Expand"} details for ${team.name}`}
                                  aria-expanded={isExpanded}
                                  onClick={() =>
                                    setExpandedTeamId(isExpanded ? null : team.id)
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
                          {hasAnalysis && (
                            <div className="score">
                              <strong>{team.score}</strong>
                              <small>FIT</small>
                            </div>
                          )}
                        </div>

                        <div className="team-status-row">
                          <span className={`availability ${team.status}`}>
                            {team.status}
                          </span>
                          {hasAnalysis && (
                            <button
                              type="button"
                              className="select-button"
                              onClick={() => setSelected(team.id)}
                            >
                              {isSelected ? "Selected ✓" : "Select team"}
                            </button>
                          )}
                          <strong>ETA: {team.etaMinutes}min</strong>
                        </div>

                        <div className={`team-details ${isExpanded ? "expanded" : ""}`}>
                          {hasAnalysis && (
                            <div className="reason-list">
                              {reasons.slice(0, 3).map((reason) => (
                                <p key={reason}>
                                  <span>✓</span>
                                  {reason}
                                </p>
                              ))}
                              {limits.slice(0, 2).map((limit) => (
                                <p className="limit" key={limit}>
                                  <span>!</span>
                                  {limit}
                                </p>
                              ))}
                            </div>
                          )}
                          <div className="equipment">
                            {(team.equipment || []).map((item) => (
                              <span key={item}>{item}</span>
                            ))}
                          </div>
                          {team.notes && <p className="team-notes">{team.notes}</p>}
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
            {dispatchSent && (
              <Suspense
                fallback={
                  <section className="panel map-panel">
                    <Empty text="Loading the response map…" compact />
                  </section>
                }
              >
                <MapPanel teams={rankedTeams} incident={result?.incident} selected={selected} />
              </Suspense>
            )}
          </div>
        </section>
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
