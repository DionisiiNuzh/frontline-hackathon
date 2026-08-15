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
