import { useEffect, useState } from 'react'

const sample = `Caller: We're on North Ridge, close to the old quarry path. My friend slipped from a ledge and landed below me. I can see him and he's talking, but he says his leg is badly hurt and he can't stand. The slope is very steep and there are loose rocks. It will be dark in about an hour. We came up from the east car park, but I don't know the grid reference. No other services are here.`

const icons = { confirmed: '✓', uncertain: '~', unknown: '?' }

function App() {
  const [transcript, setTranscript] = useState(sample)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [configured, setConfigured] = useState(false)
  const [selected, setSelected] = useState(null)

  useEffect(() => { fetch('/api/health').then((r) => r.json()).then((x) => setConfigured(x.aiConfigured)).catch(() => {}) }, [])

  async function analyse() {
    setLoading(true); setError(''); setSelected(null)
    try {
      const response = await fetch('/api/analyse', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ transcript }) })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Analysis failed')
      setResult(body)
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }

  return <div className="shell">
    <header>
      <div className="brand"><span className="mark">N</span><div><strong>Northstar</strong><small>Search & rescue coordination</small></div></div>
      <div className="status"><span className={configured ? 'dot live' : 'dot'} />{configured ? 'Claude connected' : 'Demo analysis mode'}</div>
      <div className="operator"><span>DC</span><div><strong>Dispatcher console</strong><small>Trial environment</small></div></div>
    </header>

    <main>
      <section className="intro"><div><p className="eyebrow">INCIDENT WORKSPACE · DRAFT</p><h1>Turn the call into a clear response picture.</h1><p>Extract what is known, surface what is missing, and compare the teams equipped to help.</p></div><div className="safety">Decision support only<br/><span>No team is dispatched automatically</span></div></section>

      <div className="layout">
        <section className="panel transcript-panel">
          <div className="panel-head"><div><span className="step">01</span><h2>Caller transcript</h2></div><span className="badge neutral">SIMULATED CALL</span></div>
          <textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} aria-label="Caller transcript" />
          <div className="transcript-foot"><span>{transcript.length} characters · transcript is not stored</span><button onClick={analyse} disabled={loading}>{loading ? <><i className="spinner"/>Analysing call…</> : 'Analyse incident →'}</button></div>
          {error && <div className="error">{error}</div>}
        </section>

        <section className="panel picture-panel">
          <div className="panel-head"><div><span className="step">02</span><h2>Incident picture</h2></div>{result && <span className={`badge ${result.incident.mode}`}>{result.incident.mode === 'live' ? 'CLAUDE DRAFT' : 'LOCAL DEMO DRAFT'}</span>}</div>
          {!result ? <Empty text="Analyse the call to build a structured incident picture." /> : <>
            <p className="summary">{result.incident.summary}</p>
            <div className="facts">{result.incident.fields.map((field) => <div className="fact" key={field.key}><span className={`confidence ${field.confidence}`}>{icons[field.confidence]}</span><div><small>{field.label}</small><strong>{field.value}</strong></div></div>)}</div>
            <div className="questions"><h3>Ask next <span>{result.incident.suggestedQuestions.length}</span></h3>{result.incident.suggestedQuestions.map((q, i) => <div className="question" key={q}><b>{String(i + 1).padStart(2, '0')}</b><span>{q}</span></div>)}</div>
          </>}
        </section>
      </div>

      <section className="panel teams-panel">
        <div className="panel-head"><div><span className="step">03</span><h2>Suitable teams</h2></div><span className="muted">Ranked by capability, availability & ETA</span></div>
        {!result ? <Empty text="Team suitability will appear after incident analysis." compact /> : <div className="team-grid">{result.matches.map((team, index) => <article className={`team ${index === 0 ? 'recommended' : ''}`} key={team.id}>
          <div className="team-top"><div><span className="rank">0{index + 1}</span><div><h3>{team.name}</h3><p>{team.area} · {team.people} responders</p></div></div><div className="score"><strong>{team.score}</strong><small>FIT</small></div></div>
          {index === 0 && <span className="ribbon">BEST CURRENT FIT</span>}
          <div className="team-status"><span className={`availability ${team.status}`}>{team.status}</span><strong>{team.etaMinutes} min <small>estimated</small></strong></div>
          <div className="reason-list">{team.reasons.slice(0, 3).map((x) => <p key={x}><span>✓</span>{x}</p>)}{team.limits.slice(0, 2).map((x) => <p className="limit" key={x}><span>!</span>{x}</p>)}</div>
          <div className="equipment">{team.equipment.map((x) => <span key={x}>{x}</span>)}</div>
          <button className="review" onClick={() => setSelected(team.id)}>{selected === team.id ? 'Selected for dispatcher review ✓' : 'Select for review'}</button>
        </article>)}</div>}
        {selected && <div className="selection-note">Selection recorded in this screen only. Confirm through your organisation’s normal dispatch process.</div>}
      </section>
    </main>
    <footer><span>TRIAL 0.1</span><p>AI-assisted draft · Verify all details with the caller and operational sources.</p></footer>
  </div>
}

function Empty({ text, compact = false }) { return <div className={`empty ${compact ? 'compact' : ''}`}><div className="radar"><i/><i/><i/></div><p>{text}</p></div> }

export default App
