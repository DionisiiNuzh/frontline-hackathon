import 'dotenv/config'
import express from 'express'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import WebSocket, { WebSocketServer } from 'ws'
import { analyseTranscript } from './analyse.js'
import { matchTeams } from './match.js'
import { teams } from './teams.js'

const app = express()
const server = http.createServer(app)
const port = Number(process.env.PORT || 3001)
const here = path.dirname(fileURLToPath(import.meta.url))

app.use(express.json({ limit: '100kb' }))
app.get('/api/health', (_req, res) => res.json({
  ok: true,
  aiConfigured: Boolean(process.env.ANTHROPIC_API_KEY),
  transcriptionConfigured: Boolean(process.env.DEEPGRAM_API_KEY),
}))
app.get('/api/teams', (_req, res) => res.json({ teams }))
app.post('/api/analyse', async (req, res) => {
  const transcript = typeof req.body?.transcript === 'string' ? req.body.transcript.trim() : ''
  if (transcript.length < 20) return res.status(400).json({ error: 'Add a transcript of at least 20 characters.' })
  if (transcript.length > 20000) return res.status(400).json({ error: 'Transcript is too long for this trial.' })
  try {
    const incident = await analyseTranscript(transcript)
    res.json({ incident, matches: matchTeams(incident, teams) })
  } catch (error) {
    console.error(error)
    res.status(502).json({ error: error.message || 'Analysis failed.' })
  }
})

app.use(express.static(path.join(here, '../dist')))
app.get('*all', (_req, res) => res.sendFile(path.join(here, '../dist/index.html')))

const transcriptionServer = new WebSocketServer({ noServer: true })

server.on('upgrade', (request, socket, head) => {
  if (new URL(request.url, 'http://localhost').pathname !== '/api/transcribe') {
    socket.destroy()
    return
  }
  transcriptionServer.handleUpgrade(request, socket, head, (browser) => {
    transcriptionServer.emit('connection', browser)
  })
})

transcriptionServer.on('connection', (browser) => {
  const apiKey = process.env.DEEPGRAM_API_KEY
  if (!apiKey) {
    browser.send(JSON.stringify({ type: 'error', message: 'DEEPGRAM_API_KEY is not configured.' }))
    browser.close()
    return
  }

  const query = new URLSearchParams({
    model: 'nova-3', language: 'en-GB', smart_format: 'true', punctuate: 'true',
    interim_results: 'true', endpointing: '500', utterance_end_ms: '1000', vad_events: 'true',
  })
  const deepgram = new WebSocket(`wss://api.deepgram.com/v1/listen?${query}`, {
    headers: { Authorization: `Token ${apiKey}` },
  })
  const send = (message) => {
    if (browser.readyState === WebSocket.OPEN) browser.send(JSON.stringify(message))
  }

  deepgram.on('open', () => {
    console.info('[transcription] Deepgram connected')
    send({ type: 'ready' })
  })
  deepgram.on('message', (data) => {
    const event = JSON.parse(data.toString())
    if (event.type === 'UtteranceEnd') {
      console.debug('[transcription] Deepgram utterance end', {
        channel: event.channel,
        lastWordEnd: event.last_word_end,
      })
      return
    }
    const alternative = event.channel?.alternatives?.[0]
    const text = alternative?.transcript?.trim()
    if (!text) return
    console.debug('[transcription] Deepgram result', {
      text,
      isFinal: Boolean(event.is_final),
      speechFinal: Boolean(event.speech_final),
    })
    send({ type: 'interim', text, isFinal: Boolean(event.is_final) })
    if (event.is_final) send({ type: 'final', text })
  })
  deepgram.on('error', (error) => {
    console.error('[transcription] Deepgram error', error)
    send({ type: 'error', message: error.message || 'Transcription failed.' })
  })
  deepgram.on('close', (code) => {
    console.info('[transcription] Deepgram closed', { code })
    send({ type: 'closed', code })
  })

  browser.on('message', (data, isBinary) => {
    if (deepgram.readyState !== WebSocket.OPEN) return
    if (isBinary) {
      deepgram.send(data)
      return
    }
    const event = JSON.parse(data.toString())
    if (event.type === 'finish') deepgram.send(JSON.stringify({ type: 'CloseStream' }))
  })
  browser.on('close', () => {
    if (deepgram.readyState === WebSocket.OPEN) deepgram.close()
  })
})

server.listen(port, () => console.log(`Northstar API listening on http://localhost:${port}`))
