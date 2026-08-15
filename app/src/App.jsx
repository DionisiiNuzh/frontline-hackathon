import { useEffect, useRef, useState } from 'react'

const sample = `Caller: We're on North Ridge, close to the old quarry path. My friend slipped from a ledge and landed below me. I can see him and he's talking, but he says his leg is badly hurt and he can't stand. The slope is very steep and there are loose rocks. It will be dark in about an hour. We came up from the east car park, but I don't know the grid reference. No other services are here.`

const icons = { confirmed: '✓', uncertain: '~', unknown: '?' }

function App() {
  const [transcript, setTranscript] = useState(sample)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [configured, setConfigured] = useState(false)
  const [transcriptionConfigured, setTranscriptionConfigured] = useState(false)
  const [selected, setSelected] = useState(null)
  const [audioUrl, setAudioUrl] = useState('')
  const [audioName, setAudioName] = useState('')
  const [interim, setInterim] = useState('')
  const [callStatus, setCallStatus] = useState('ready')
  const audioRef = useRef(null)
  const socketRef = useRef(null)
  const recorderRef = useRef(null)
  const transcriptRef = useRef('')
  const revisionRef = useRef(0)

  useEffect(() => {
    fetch('/api/health').then((r) => r.json()).then((x) => {
      setConfigured(x.aiConfigured)
      setTranscriptionConfigured(x.transcriptionConfigured)
    }).catch(() => {})
    return () => {
      socketRef.current?.close()
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [audioUrl])

  async function analyse(nextTranscript, revision) {
    setLoading(true); setError('')
    try {
      const response = await fetch('/api/analyse', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ transcript: nextTranscript }) })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Analysis failed')
      if (revision === revisionRef.current) setResult(body)
    } catch (err) {
      if (revision === revisionRef.current) setError(err.message)
    } finally {
      if (revision === revisionRef.current) setLoading(false)
    }
  }

  function chooseAudio(event) {
    const file = event.target.files?.[0]
    if (!file) return
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioUrl(URL.createObjectURL(file))
    setAudioName(file.name)
    setCallStatus('ready')
    setTranscript('')
    transcriptRef.current = ''
    setInterim('')
    setResult(null)
    setError('')
  }

  function startCall() {
    const audio = audioRef.current
    if (!audioUrl || !audio) return
    const capture = audio.captureStream || audio.mozCaptureStream
    if (!capture) {
      setError('This browser cannot stream audio-element playback. Use Chrome or Chromium for this trial.')
      return
    }

    setError('')
    setCallStatus('connecting')
    setTranscript('')
    transcriptRef.current = ''
    revisionRef.current = 0
    setInterim('')
    setResult(null)
    setSelected(null)
    audio.currentTime = 0

    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const socket = new WebSocket(`${protocol}//${location.host}/api/transcribe`)
    socketRef.current = socket
    socket.onmessage = async ({ data }) => {
      const event = JSON.parse(data)
      if (event.type === 'ready') {
        try {
          const stream = capture.call(audio)
          const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'].find((type) => MediaRecorder.isTypeSupported(type))
          const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
          recorderRef.current = recorder
          recorder.ondataavailable = async ({ data: chunk }) => {
            if (chunk.size && socket.readyState === WebSocket.OPEN) socket.send(await chunk.arrayBuffer())
          }
          recorder.onstop = () => {
            if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'finish' }))
          }
          recorder.start(250)
          await audio.play()
          setCallStatus('playing')
        } catch (err) {
          setError(err.message || 'Audio playback could not start.')
          setCallStatus('error')
          socket.close()
        }
      }
      if (event.type === 'interim') setInterim(event.isFinal ? '' : event.text)
      if (event.type === 'utterance') {
        const next = [transcriptRef.current, event.text].filter(Boolean).join('\n')
        transcriptRef.current = next
        setTranscript(next)
        setInterim('')
        const revision = ++revisionRef.current
        analyse(next, revision)
      }
      if (event.type === 'error') {
        setError(event.message)
        setCallStatus('error')
      }
      if (event.type === 'closed') setCallStatus('complete')
    }
    socket.onerror = () => {
      setError('Could not connect to live transcription.')
      setCallStatus('error')
    }
  }

  function finishCall() {
    audioRef.current?.pause()
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
    setCallStatus('finishing')
  }

  return <div className="shell">
    <header>
      <div className="brand"><span className="mark">N</span><div><strong>Northstar</strong><small>Search & rescue coordination</small></div></div>
      <div className="status"><span className={configured && transcriptionConfigured ? 'dot live' : 'dot'} />{configured && transcriptionConfigured ? 'Voice pipeline connected' : 'Voice setup required'}</div>
      <div className="operator"><span>DC</span><div><strong>Dispatcher console</strong><small>Trial environment</small></div></div>
    </header>

    <main>
      <section className="workspace-bar">
        <div><p className="eyebrow">ACTIVE INCIDENT</p><h1>Incident workspace</h1></div>
        <div className="safety">Decision support only<br/><span>No team is dispatched automatically</span></div>
      </section>
      <div className="layout">
        <section className="panel transcript-panel">
          <div className="panel-head"><div><span className="step">01</span><h2>Live call transcript</h2></div><span className="badge neutral">{callStatus.toUpperCase()}</span></div>
          <div className="audio-source">
            <input id="audio-file" type="file" accept="audio/*" onChange={chooseAudio} />
            <label htmlFor="audio-file">{audioName || 'Choose incident recording'}</label>
            <audio ref={audioRef} src={audioUrl} onEnded={finishCall} />
          </div>
          <div className="live-transcript" aria-live="polite">
            {transcript ? <p>{transcript}</p> : <span>Finalized speech will appear here while the recording plays.</span>}
            {interim && <em>{interim}</em>}
          </div>
          <div className="transcript-foot"><span>{transcript.length} characters · transcript is not stored</span>{callStatus === 'playing' ? <button onClick={finishCall}>Stop call</button> : <button onClick={startCall} disabled={!audioUrl || callStatus === 'connecting' || callStatus === 'finishing'}>{callStatus === 'connecting' ? 'Connecting…' : 'Start call →'}</button>}</div>
          {error && <div className="error">{error}</div>}
        </section>

        <section className="panel picture-panel">
          <div className="panel-head"><div><span className="step">02</span><h2>Incident picture</h2></div>{result && <span className={`badge ${result.incident.mode}`}>{result.incident.mode === 'live' ? 'CLAUDE DRAFT' : 'LOCAL DEMO DRAFT'}</span>}</div>
          {!result ? <Empty text={loading ? 'Building the incident picture from the live transcript…' : 'Start the call to build a structured incident picture.'} /> : <>
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
