import test from 'node:test'
import assert from 'node:assert/strict'
import { matchTeams } from '../server/match.js'
import { demoAnalysis } from '../server/analyse.js'
import { teams } from '../server/teams.js'

test('ranks an available technical team above a tasked team', () => {
  const result = matchTeams({ requiredCapabilities: ['steep-ground', 'rope-rescue', 'medical'] }, teams)
  assert.equal(result[0].id, 'ridge-1')
  assert.ok(result[0].score > result.at(-1).score)
  assert.ok(result[0].reasons.some((reason) => reason.includes('rope rescue')))
})

test('demo extraction marks unsupported detail as unknown or uncertain', () => {
  const result = demoAnalysis('A walker is hurt somewhere on North Ridge near the quarry. The ground is steep.')
  const location = result.fields.find((field) => field.key === 'exactLocation')
  assert.equal(location.confidence, 'uncertain')
  assert.ok(result.suggestedQuestions.some((question) => question.includes('exact location')))
})
