import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

vi.mock('leaflet', () => {
  class FakeMap {
    static instances = []

    constructor(container, options) {
      this.container = container
      this.options = options
      this.controls = []
      this.fitBounds = vi.fn()
      this.invalidateSize = vi.fn()
      this.remove = vi.fn()
      FakeMap.instances.push(this)
    }

    whenReady(handler) {
      handler()
      return this
    }
  }

  class FakeControl {
    constructor(type, options) {
      this.type = type
      this.options = options
    }

    addTo(map) {
      map.controls.push(this)
      return this
    }
  }

  class FakeTileLayer {
    static instances = []

    constructor(url, options) {
      this.url = url
      this.options = options
      this.handlers = new Map()
      FakeTileLayer.instances.push(this)
    }

    on(event, handler) {
      this.handlers.set(event, handler)
      return this
    }

    addTo(map) {
      this.map = map
      return this
    }

    trigger(event) {
      this.handlers.get(event)?.()
    }
  }

  class FakeMarker {
    static instances = []

    constructor(coordinates, options) {
      this.coordinates = coordinates
      this.options = options
      this.remove = vi.fn(() => this.options.icon.options.html.remove())
      FakeMarker.instances.push(this)
    }

    bindPopup(content, options) {
      this.popup = { content, options }
      return this
    }

    addTo(map) {
      this.map = map
      map.container.append(this.options.icon.options.html)
      return this
    }
  }

  const control = {
    zoom: (options) => new FakeControl('zoom', options),
    attribution: (options) => new FakeControl('attribution', options),
  }

  return {
    Map: FakeMap,
    Marker: FakeMarker,
    TileLayer: FakeTileLayer,
    map: (container, options) => new FakeMap(container, options),
    marker: (coordinates, options) => new FakeMarker(coordinates, options),
    tileLayer: (url, options) => new FakeTileLayer(url, options),
    divIcon: (options) => ({ options }),
    control,
  }
})
