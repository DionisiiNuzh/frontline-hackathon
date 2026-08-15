const fieldDefinitions = [
  ['majorIncident', 'Major incident'], ['exactLocation', 'Exact location'],
  ['incidentType', 'Type of incident'], ['hazards', 'Hazards'], ['access', 'Access'],
  ['casualties', 'Casualties'], ['services', 'Services present'],
]

const factSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    value: { type: 'string' },
    confidence: { type: 'string', enum: ['confirmed', 'uncertain', 'unknown'] },
  },
  required: ['value', 'confidence'],
}

const extractionTool = {
  name: 'record_incident',
  description: 'Return a concise incident record using only caller-supported details.',
  input_schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      suggestedQuestions: { type: 'array', maxItems: 3, items: { type: 'string' } },
      facts: {
        type: 'object',
        additionalProperties: false,
        properties: Object.fromEntries(fieldDefinitions.map(([key]) => [key, factSchema])),
        required: fieldDefinitions.map(([key]) => key),
      },
      requiredCapabilities: { type: 'array', items: { type: 'string', enum: ['steep-ground', 'rope-rescue', 'medical', 'night-operations', 'search', 'off-road', 'swift-water', 'winch', 'aerial-search'] } },
    },
    required: ['suggestedQuestions', 'facts', 'requiredCapabilities'],
  },
}

export function demoAnalysis(transcript) {
  const lower = transcript.toLowerCase()
  const cliff = /cliff|crag|ledge|steep/.test(lower)
  const injured = /hurt|injur|broken|bleed|unconscious/.test(lower)
  const dark = /dark|night|sun.*(down|set)/.test(lower)
  const extracted = {
    majorIncident: ['No', 'uncertain'],
    exactLocation: [/north ridge/.test(lower) ? 'North Ridge, near the old quarry path' : 'Not established', /north ridge/.test(lower) ? 'uncertain' : 'unknown'],
    incidentType: [cliff ? 'Person stranded after a fall on steep ground' : 'Search and rescue incident', cliff ? 'confirmed' : 'uncertain'],
    hazards: [cliff ? 'Steep and exposed terrain; loose rock possible' : 'Not established', cliff ? 'uncertain' : 'unknown'],
    access: [/quarry/.test(lower) ? 'Caller approached via old quarry path' : 'Not established', /quarry/.test(lower) ? 'uncertain' : 'unknown'],
    casualties: [injured ? 'One reported casualty with a possible leg injury' : 'Number and condition not established', injured ? 'uncertain' : 'unknown'],
    services: ['None reported', 'uncertain'],
  }
  return {
    summary: cliff ? 'Caller reports a person stranded on steep ground with a possible injury.' : 'Caller reports an incident requiring location and risk clarification.',
    fields: fieldDefinitions.map(([key, label]) => ({ key, label, value: extracted[key][0], confidence: extracted[key][1] })),
    requiredCapabilities: [...(cliff ? ['steep-ground', 'rope-rescue'] : ['search']), ...(injured ? ['medical'] : []), ...(dark ? ['night-operations'] : [])],
    suggestedQuestions: ['What is your exact location or grid reference?', 'Is the casualty conscious and breathing normally?', 'Are there any immediate hazards such as loose rock or rising water?', 'What is the safest access route for responders?'],
    uncertainties: ['Location has not been independently verified', 'Casualty condition is based on the caller’s report'],
  }
}

export function normalizeIncident(input) {
  const { facts = {}, ...incidentInput } = input
  const incident = { ...incidentInput }
  const receivedFields = new Map((incident.fields || []).map((field) => [field.key, field]))
  incident.fields = fieldDefinitions.map(([key, label]) => {
    const field = facts[key] || receivedFields.get(key)
    return {
      key,
      label,
      value: typeof field?.value === 'string' && field.value.trim() ? field.value.trim() : 'Not established',
      confidence: ['confirmed', 'uncertain', 'unknown'].includes(field?.confidence) ? field.confidence : 'unknown',
    }
  })
  incident.suggestedQuestions = (incident.suggestedQuestions || [])
    .filter((question) => typeof question === 'string' && question.trim())
    .slice(0, 3)
  incident.requiredCapabilities = Array.isArray(incident.requiredCapabilities) ? incident.requiredCapabilities : []
  incident.uncertainties = fieldDefinitions
    .map(([key, label]) => {
      const field = incident.fields.find((candidate) => candidate.key === key)
      if (field.confidence === 'unknown') return `${label} has not been established`
      if (field.confidence === 'uncertain') return `${label} requires verification`
      return null
    })
    .filter(Boolean)

  if (typeof incident.summary === 'string' && incident.summary.trim()) {
    incident.summary = incident.summary.trim()
    return incident
  }

  const fields = new Map((incident.fields || []).map((field) => [field.key, field.value]))
  const isEstablished = (value) => value && !/^(not established|unknown)$/i.test(value)
  const parts = [fields.get('incidentType'), fields.get('casualties')].filter(isEstablished)
  const location = fields.get('exactLocation')
  incident.summary = parts.length ? `${parts.join('. ')}.` : 'Incident details are still being established.'
  if (isEstablished(location)) incident.summary += ` Location: ${location}.`
  return incident
}

export async function analyseTranscript(transcript, { signal } = {}) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return { ...demoAnalysis(transcript), mode: 'demo' }

  const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001'
  const startedAt = performance.now()
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal,
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model, max_tokens: 600,
      system: 'Extract search-and-rescue incident facts conservatively. Never invent a location, casualty condition, hazard, service presence, or capability need. Mark missing facts unknown. Keep fact values and questions concise, and prioritize questions that close the most important gaps. Decision support only.',
      messages: [{ role: 'user', content: transcript }],
      tools: [extractionTool], tool_choice: { type: 'tool', name: 'record_incident' },
    }),
  })
  const body = await response.json()
  if (!response.ok) throw new Error(body?.error?.message || `Anthropic request failed (${response.status})`)
  const toolUse = body.content?.find((block) => block.type === 'tool_use' && block.name === 'record_incident')
  if (!toolUse?.input) throw new Error('Claude did not return a structured incident record')
  console.info('[analysis] complete', {
    model: body.model,
    durationMs: Math.round(performance.now() - startedAt),
    outputTokens: body.usage?.output_tokens,
  })
  return { ...normalizeIncident(toolUse.input), mode: 'live', model: body.model }
}
