import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import App from '../src/App.jsx'

class FakeWebSocket {
  static OPEN = 1
  static instances = []

  constructor() {
    this.readyState = FakeWebSocket.OPEN
    this.send = vi.fn()
    this.close = vi.fn()
    FakeWebSocket.instances.push(this)
  }

  receive(message) {
    this.onmessage?.({ data: JSON.stringify(message) })
  }
}

class FakeMediaRecorder {
  static isTypeSupported = () => true

  constructor() {
    this.state = 'inactive'
  }

  start() {
    this.state = 'recording'
  }

  stop() {
    this.state = 'inactive'
    this.onstop?.()
  }
}

const teams = [
  {
    id: 'ridge-1', name: 'Ridge 1', status: 'available', etaMinutes: 24,
    area: 'North Ridge', people: 6, capabilities: ['rope-rescue'],
    equipment: ['rope kit'], contact: 'Ops Channel 2', notes: 'Steep-ground specialists.',
  },
  {
    id: 'valley-3', name: 'Valley 3', status: 'available', etaMinutes: 14,
    area: 'East Trail', people: 4, capabilities: ['search'],
    equipment: ['drone'], contact: 'Alpha Dispatch', notes: 'Local search team.',
  },
  {
    id: 'forest-4', name: 'Forest 4', status: 'standby', etaMinutes: 19,
    area: 'West Forest', people: 7, capabilities: ['search'], equipment: [],
    contact: 'Forest Dispatch', notes: 'Woodland response.',
  },
  {
    id: 'air-support', name: 'Air Support', status: 'standby', etaMinutes: 31,
    area: 'Regional', people: 3, capabilities: ['winch'], equipment: [],
    contact: 'Air Desk', notes: 'Aerial support.',
  },
  {
    id: 'swift-water-2', name: 'Swift Water 2', status: 'tasked', etaMinutes: 38,
    area: 'River District', people: 5, capabilities: ['swift-water'], equipment: [],
    contact: 'Water Ops', notes: 'Water rescue.',
  },
  {
    id: 'cave-6', name: 'Cave 6', status: 'tasked', etaMinutes: 46,
    area: 'Southern Range', people: 6, capabilities: ['rope-rescue'], equipment: [],
    contact: 'Cave Desk', notes: 'Cave rescue.',
  },
]

const incident = {
  summary: 'Caller reports a casualty on steep ground.',
  mode: 'live',
  fields: [
    { key: 'majorIncident', label: 'Major incident', value: 'No', confidence: 'uncertain' },
    { key: 'exactLocation', label: 'Exact location', value: 'North Ridge', confidence: 'confirmed' },
    { key: 'incidentType', label: 'Type', value: 'Fall', confidence: 'confirmed' },
    { key: 'hazards', label: 'Hazards', value: 'Loose rock', confidence: 'confirmed' },
    { key: 'access', label: 'Access', value: 'East path', confidence: 'uncertain' },
    { key: 'casualties', label: 'Casualties', value: 'One', confidence: 'confirmed' },
    { key: 'services', label: 'Services', value: 'None', confidence: 'uncertain' },
  ],
  suggestedQuestions: ['What is the grid reference?'],
}

const analysis = {
  incident,
  matches: teams.map((team, index) => ({
    ...team,
    score: 90 - index,
    reasons: ['Has required capability'],
    limits: [],
  })),
}

function response(body) {
  return { ok: true, json: async () => body }
}

function startVoiceCall() {
  fireEvent.change(screen.getByLabelText('Choose incident recording'), {
    target: { files: [new File(['audio'], 'incident.m4a', { type: 'audio/mp4' })] },
  })
  fireEvent.click(screen.getByRole('button', { name: /start call/i }))
  return FakeWebSocket.instances[0]
}

beforeEach(() => {
  FakeWebSocket.instances = []
  vi.stubGlobal('WebSocket', FakeWebSocket)
  vi.stubGlobal('MediaRecorder', FakeMediaRecorder)
  vi.stubGlobal('fetch', vi.fn(async (url) => {
    if (String(url).includes('/api/health')) {
      return response({ aiConfigured: true, transcriptionConfigured: true })
    }
    if (String(url).includes('/api/teams')) return response({ teams })
    return response(analysis)
  }))
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:incident-call'),
    revokeObjectURL: vi.fn(),
  })
  Object.defineProperty(HTMLMediaElement.prototype, 'captureStream', { configurable: true, value: vi.fn(() => ({})) })
  Object.defineProperty(HTMLMediaElement.prototype, 'play', { configurable: true, value: vi.fn(() => Promise.resolve()) })
  Object.defineProperty(HTMLMediaElement.prototype, 'pause', { configurable: true, value: vi.fn() })
  Object.defineProperty(HTMLElement.prototype, 'scrollTo', { configurable: true, value: vi.fn() })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

test('adding a finalized segment preserves every existing conversation bubble', async () => {
  render(<App />)

  const socket = startVoiceCall()
  await act(async () => socket.receive({ type: 'ready' }))
  act(() => socket.receive({ type: 'final', text: 'First caller statement.' }))
  act(() => socket.receive({ type: 'final', text: 'Dispatcher asks a question.' }))

  expect(screen.getAllByRole('listitem')).toHaveLength(2)
  expect(screen.getByText('First caller statement.')).toBeVisible()
  expect(screen.getByText('Dispatcher asks a question.')).toBeVisible()

  act(() => socket.receive({ type: 'final', text: 'Caller provides the location.' }))

  expect(screen.getAllByRole('listitem')).toHaveLength(3)
  expect(screen.getByText('First caller statement.')).toBeVisible()
  expect(screen.getByText('Dispatcher asks a question.')).toBeVisible()
  expect(screen.getByText('Caller provides the location.')).toBeVisible()
})

test('shows the roster before analysis and expands from the top five', async () => {
  render(<App />)

  expect(await screen.findByRole('heading', { name: 'Available teams' })).toBeVisible()
  expect(await screen.findByText('Valley 3')).toBeVisible()
  expect(screen.queryByText('Cave 6')).not.toBeInTheDocument()
  expect(screen.queryByText('FIT')).not.toBeInTheDocument()
  expect(screen.queryByText('MIN')).not.toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: 'View all teams' }))
  expect(screen.getByText('Cave 6')).toBeVisible()

  fireEvent.click(screen.getByRole('button', { name: 'Expand details for Ridge 1' }))
  expect(screen.getByText('Steep-ground specialists.')).toBeVisible()
})

test('waits for enough finalized text before requesting analysis', async () => {
  render(<App />)
  const socket = startVoiceCall()
  await act(async () => socket.receive({ type: 'ready' }))

  act(() => socket.receive({ type: 'final', text: 'Short.' }))
  expect(fetch.mock.calls.filter(([url]) => String(url).includes('/api/analyse'))).toHaveLength(0)

  act(() => socket.receive({ type: 'final', text: 'The location is North Ridge.' }))
  await waitFor(() => {
    expect(fetch.mock.calls.filter(([url]) => String(url).includes('/api/analyse'))).toHaveLength(1)
  })
})

test('selecting an incident-ranked team updates the METHANE message', async () => {
  render(<App />)
  const socket = startVoiceCall()
  await act(async () => socket.receive({ type: 'ready' }))
  act(() => socket.receive({ type: 'final', text: 'A caller reports a fall on North Ridge.' }))

  expect(await screen.findByRole('heading', { name: 'Suitable teams' })).toBeVisible()
  expect(screen.queryByText(incident.summary)).not.toBeInTheDocument()
  expect(document.querySelector('.facts .fact small')).toHaveTextContent('Type')
  expect(screen.queryByText('Major incident')).not.toBeInTheDocument()
  fireEvent.click(screen.getAllByRole('button', { name: 'Select team' })[0])

  expect(screen.getByText(/E - Emergency services: Ridge 1 selected/)).toBeVisible()
  expect(screen.getByText('Ridge 1 · Ops Channel 2')).toBeVisible()

  act(() => socket.receive({ type: 'final', text: 'The caller confirms loose rock.' }))
  await waitFor(() => {
    expect(screen.getByRole('button', { name: 'Selected ✓' })).toBeVisible()
  })
})

test('an older analysis response cannot replace a newer transcript revision', async () => {
  const pending = []
  fetch.mockImplementation(async (url) => {
    if (String(url).includes('/api/health')) {
      return response({ aiConfigured: true, transcriptionConfigured: true })
    }
    if (String(url).includes('/api/teams')) return response({ teams })
    return new Promise((resolve) => pending.push(resolve))
  })

  render(<App />)
  const socket = startVoiceCall()
  await act(async () => socket.receive({ type: 'ready' }))
  act(() => socket.receive({ type: 'final', text: 'A caller reports a fall on North Ridge.' }))
  act(() => socket.receive({ type: 'final', text: 'The casualty is conscious and talking.' }))
  expect(pending).toHaveLength(2)

  await act(async () => pending[1](response({
    ...analysis,
    incident: {
      ...incident,
      fields: incident.fields.map((field) => field.key === 'exactLocation'
        ? { ...field, value: 'Newest location.' }
        : field),
    },
  })))
  expect(await screen.findByText('Newest location.')).toBeVisible()

  await act(async () => pending[0](response({
    ...analysis,
    incident: {
      ...incident,
      fields: incident.fields.map((field) => field.key === 'exactLocation'
        ? { ...field, value: 'Stale location.' }
        : field),
    },
  })))
  expect(screen.getByText('Newest location.')).toBeVisible()
  expect(screen.queryByText('Stale location.')).not.toBeInTheDocument()
})
