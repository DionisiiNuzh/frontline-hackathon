const extractionTool = {
  name: 'record_incident',
  description: 'Record only incident details supported by the caller transcript. Mark unknown or ambiguous details explicitly.',
  input_schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      summary: { type: 'string' },
      fields: {
        type: 'array', items: { type: 'object', additionalProperties: false,
          properties: {
            key: { type: 'string', enum: ['majorIncident', 'exactLocation', 'incidentType', 'hazards', 'access', 'casualties', 'services'] },
            label: { type: 'string' }, value: { type: 'string' },
            confidence: { type: 'string', enum: ['confirmed', 'uncertain', 'unknown'] },
          }, required: ['key', 'label', 'value', 'confidence'] },
      },
      requiredCapabilities: { type: 'array', items: { type: 'string', enum: ['steep-ground', 'rope-rescue', 'medical', 'night-operations', 'search', 'off-road', 'swift-water', 'winch', 'aerial-search'] } },
      suggestedQuestions: { type: 'array', items: { type: 'string' } },
      uncertainties: { type: 'array', items: { type: 'string' } },
    },
    required: ['summary', 'fields', 'requiredCapabilities', 'suggestedQuestions', 'uncertainties'],
  },
}

const labels = [
  ['majorIncident', 'Major incident'], ['exactLocation', 'Exact location'],
  ['incidentType', 'Type of incident'], ['hazards', 'Hazards'], ['access', 'Access'],
  ['casualties', 'Casualties'], ['services', 'Services present'],
]

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
    fields: labels.map(([key, label]) => ({ key, label, value: extracted[key][0], confidence: extracted[key][1] })),
    requiredCapabilities: [...(cliff ? ['steep-ground', 'rope-rescue'] : ['search']), ...(injured ? ['medical'] : []), ...(dark ? ['night-operations'] : [])],
    suggestedQuestions: ['What is your exact location or grid reference?', 'Is the casualty conscious and breathing normally?', 'Are there any immediate hazards such as loose rock or rising water?', 'What is the safest access route for responders?'],
    uncertainties: ['Location has not been independently verified', 'Casualty condition is based on the caller’s report'],
  }
}

export async function analyseTranscript(transcript) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return { ...demoAnalysis(transcript), mode: 'demo' }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5', max_tokens: 1400,
      system: 'You support a search-and-rescue dispatcher. Extract facts conservatively. Never invent a location, casualty condition, hazard, service presence, or capability need. This is decision support, not operational advice.',
      messages: [{ role: 'user', content: `Extract a draft incident record from this caller transcript:\n\n${transcript}` }],
      tools: [extractionTool], tool_choice: { type: 'tool', name: 'record_incident' },
    }),
  })
  const body = await response.json()
  if (!response.ok) throw new Error(body?.error?.message || `Anthropic request failed (${response.status})`)
  const toolUse = body.content?.find((block) => block.type === 'tool_use' && block.name === 'record_incident')
  if (!toolUse?.input) throw new Error('Claude did not return a structured incident record')
  return { ...toolUse.input, mode: 'live', model: body.model }
}
