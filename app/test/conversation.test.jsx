import { act, fireEvent, render, screen } from '@testing-library/react'
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

beforeEach(() => {
  FakeWebSocket.instances = []
  vi.stubGlobal('WebSocket', FakeWebSocket)
  vi.stubGlobal('MediaRecorder', FakeMediaRecorder)
  vi.stubGlobal('fetch', vi.fn(async (url) => ({
    ok: true,
    json: async () => String(url).includes('/api/health')
      ? { aiConfigured: true, transcriptionConfigured: true }
      : { incident: { summary: 'Draft summary', fields: [], suggestedQuestions: [], mode: 'live' }, matches: [] },
  })))
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:incident-call'),
    revokeObjectURL: vi.fn(),
  })
  Object.defineProperty(HTMLMediaElement.prototype, 'captureStream', { configurable: true, value: vi.fn(() => ({})) })
  Object.defineProperty(HTMLMediaElement.prototype, 'play', { configurable: true, value: vi.fn(() => Promise.resolve()) })
  Object.defineProperty(HTMLMediaElement.prototype, 'pause', { configurable: true, value: vi.fn() })
  Object.defineProperty(HTMLElement.prototype, 'scrollTo', { configurable: true, value: vi.fn() })
})

afterEach(() => vi.unstubAllGlobals())

test('adding a finalized segment preserves every existing conversation bubble', async () => {
  render(<App />)

  fireEvent.change(screen.getByLabelText('Choose incident recording'), {
    target: { files: [new File(['audio'], 'incident.m4a', { type: 'audio/mp4' })] },
  })
  fireEvent.click(screen.getByRole('button', { name: /start call/i }))

  const socket = FakeWebSocket.instances[0]
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
