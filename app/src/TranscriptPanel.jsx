import { useLayoutEffect, useRef } from 'react'

function TranscriptPanel({
  audioName,
  audioRef,
  audioUrl,
  callStatus,
  error,
  interim,
  loading,
  onChooseAudio,
  onFinishCall,
  onStartCall,
  transcript,
}) {
  const transcriptPanelRef = useRef(null)

  useLayoutEffect(() => {
    const panel = transcriptPanelRef.current
    if (!panel) return
    panel.scrollTop = panel.scrollHeight
    console.log('[transcript] rendered', {
      segmentCount: transcript ? transcript.split('\n').length : 0,
      interim,
      scrollTop: panel.scrollTop,
      scrollHeight: panel.scrollHeight,
    })
  }, [transcript, interim])

  const segments = transcript ? transcript.split('\n') : []
  const callInProgress = callStatus === 'playing'
  const callIsTransitioning = callStatus === 'connecting' || callStatus === 'finishing'

  return <section className="panel transcript-panel">
    <div className="panel-head">
      <div><span className="step">01</span><h2>Live call transcript</h2></div>
      <span className="badge neutral">{callStatus.toUpperCase()}</span>
    </div>
    <div className="audio-source">
      <input id="audio-file" type="file" accept="audio/*" onChange={onChooseAudio} />
      <label htmlFor="audio-file">{audioName || 'Choose incident recording'}</label>
      <audio ref={audioRef} src={audioUrl || undefined} onEnded={onFinishCall} />
    </div>
    <div className="live-transcript" ref={transcriptPanelRef} aria-live="polite">
      {segments.length > 0
        ? <ol className="conversation" aria-label="Finalized call transcript">
          {segments.map((segment, index) => <li className="transcript-segment" key={`${index}-${segment}`}>
            <small aria-hidden="true">{String(index + 1).padStart(2, '0')}</small>
            <p>{segment}</p>
          </li>)}
        </ol>
        : <span>Finalized speech will appear here while the recording plays.</span>}
      {interim && <div className="transcript-segment interim"><small>••</small><p>{interim}</p></div>}
    </div>
    <div className="transcript-foot">
      <span>{loading ? 'Updating incident picture…' : `${transcript.length} characters · transcript is not stored`}</span>
      {callInProgress
        ? <button onClick={onFinishCall}>Stop call</button>
        : <button onClick={onStartCall} disabled={!audioUrl || callIsTransitioning}>
          {callStatus === 'connecting' ? 'Connecting…' : 'Start call →'}
        </button>}
    </div>
    {error && <div className="error">{error}</div>}
  </section>
}

export default TranscriptPanel
