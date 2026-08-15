import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test } from 'vitest'
import * as L from 'leaflet'
import MapPanel, {
  CARTO_DARK_TILE_URL,
  UK_BOUNDS,
  resolveIncidentLocation,
} from '../src/MapPanel.jsx'

const teams = [
  {
    id: 'ridge-1',
    name: 'Ridge 1',
    status: 'available',
    etaMinutes: 24,
    location: { label: 'Keswick', latitude: 54.6013, longitude: -3.1347 },
  },
  {
    id: 'valley-3',
    name: 'Valley 3',
    status: 'standby',
    etaMinutes: 14,
    location: { label: 'York', latitude: 53.959, longitude: -1.0815 },
  },
]

function incidentAt(value) {
  return { fields: [{ key: 'exactLocation', value }] }
}

beforeEach(() => {
  L.Map.instances = []
  L.Marker.instances = []
  L.TileLayer.instances = []
})

afterEach(cleanup)

test('initialises a dark UK map with focused navigation controls', () => {
  render(<MapPanel teams={teams} incident={incidentAt('North Ridge')} selected="ridge-1" />)

  const map = L.Map.instances[0]
  expect(L.TileLayer.instances[0].url).toBe(CARTO_DARK_TILE_URL)
  expect(map.fitBounds).toHaveBeenCalledWith(UK_BOUNDS, {
    padding: [28, 28],
    animate: false,
  })
  expect(map.options.maxBounds).toEqual([[48, -12], [63, 5]])
  expect(map.options.scrollWheelZoom).toBe(false)
  expect(map.controls).toHaveLength(2)
  expect(map.controls.map(({ options }) => options.position)).toEqual(['topright', 'bottomright'])
  expect(screen.getByRole('region', { name: /incident at North Ridge/i })).toBeVisible()
  expect(screen.getByRole('heading', { name: 'Response map' })).toBeVisible()
})

test('renders geographic team and incident markers with safe popups', () => {
  render(<MapPanel teams={teams} incident={incidentAt('North Ridge')} selected="ridge-1" />)

  expect(L.Marker.instances).toHaveLength(3)
  const ridgeMarker = screen.getByRole('button', {
    name: 'Ridge 1, Keswick, available, 24 minute ETA',
  })
  expect(ridgeMarker).toHaveClass('selected')
  expect(L.Marker.instances[0].coordinates).toEqual([54.6013, -3.1347])
  expect(screen.getByRole('button', { name: 'Incident at North Ridge, Lake District' })).toBeVisible()
  expect(L.Marker.instances[0].popup.content).toHaveTextContent('Keswick')
  expect(L.Marker.instances[0].popup.content).toHaveTextContent('AVAILABLE · 24 MIN ETA')
})

test('does not invent coordinates for an unknown incident', () => {
  render(<MapPanel teams={teams} incident={incidentAt('Unconfirmed forestry track')} selected={null} />)

  expect(resolveIncidentLocation('Unconfirmed forestry track')).toBeNull()
  expect(L.Marker.instances).toHaveLength(2)
  expect(screen.getByRole('status')).toHaveTextContent('Incident location not mapped')
  expect(screen.queryByRole('button', { name: /^Incident at/ })).not.toBeInTheDocument()
})

test('surfaces a tile error without removing operational context', () => {
  render(<MapPanel teams={teams} incident={incidentAt('North Ridge')} selected={null} />)

  act(() => L.TileLayer.instances[0].trigger('tileerror'))
  expect(screen.getByRole('status')).toHaveTextContent('Map tiles unavailable')
  expect(screen.getByText(/Ridge 1, Keswick, available/)).toBeInTheDocument()
})
