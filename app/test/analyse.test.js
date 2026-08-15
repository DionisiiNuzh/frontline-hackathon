import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeIncident } from '../server/analyse.js'

test('keeps a summary returned by the model', () => {
  const incident = normalizeIncident({ summary: 'Caller reports a fall.' })
  assert.equal(incident.summary, 'Caller reports a fall.')
})

test('derives a summary when the model omits it', () => {
  const incident = normalizeIncident({
    fields: [
      { key: 'incidentType', value: 'Fall from a ledge' },
      { key: 'casualties', value: 'One conscious casualty with a leg injury' },
      { key: 'exactLocation', value: 'North Ridge' },
    ],
  })
  assert.equal(incident.summary, 'Fall from a ledge. One conscious casualty with a leg injury. Location: North Ridge.')
})

test('normalizes a compact model result into every incident field', () => {
  const incident = normalizeIncident({
    summary: 'Caller reports a fall.',
    fields: [
      { key: 'incidentType', value: 'Fall from a ledge', confidence: 'confirmed' },
    ],
    suggestedQuestions: ['Where exactly are you?', 'Is anyone injured?', 'Are there hazards?', 'Who is on scene?'],
  })

  assert.equal(incident.fields.length, 7)
  assert.deepEqual(incident.fields.find((field) => field.key === 'incidentType'), {
    key: 'incidentType',
    label: 'Type of incident',
    value: 'Fall from a ledge',
    confidence: 'confirmed',
  })
  assert.deepEqual(incident.fields.find((field) => field.key === 'exactLocation'), {
    key: 'exactLocation',
    label: 'Exact location',
    value: 'Not established',
    confidence: 'unknown',
  })
  assert.equal(incident.suggestedQuestions.length, 3)
  assert.ok(incident.uncertainties.includes('Exact location has not been established'))
})
