import 'dotenv/config'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { analyseTranscript } from './analyse.js'
import { matchTeams } from './match.js'
import { teams } from './teams.js'

const app = express()
const port = Number(process.env.PORT || 3001)
const here = path.dirname(fileURLToPath(import.meta.url))

app.use(express.json({ limit: '100kb' }))
app.get('/api/health', (_req, res) => res.json({ ok: true, aiConfigured: Boolean(process.env.ANTHROPIC_API_KEY) }))
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
app.listen(port, () => console.log(`Northstar API listening on http://localhost:${port}`))
