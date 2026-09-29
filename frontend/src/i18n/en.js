export const text = {
  app: {
    eyebrow: 'GBA pilot',
    title: 'Civic Issue Tracker',
    description: 'A location-aware reporting portal for the GBA pilot.'
  },
  health: {
    title: 'System status',
    description: 'This page checks the backend through the Vite /api proxy.',
    server: 'Server',
    database: 'Database',
    ready: 'Ready',
    degraded: 'Degraded',
    offline: 'Offline',
    checking: 'Checking',
    ok: 'OK',
    down: 'DOWN',
    unknown: 'UNKNOWN',
    notReachable: 'NOT REACHABLE',
    error: 'Server not reachable. Start the backend and refresh this page.'
  },
  categories: {
    title: 'Reportable categories',
    description: 'These choices come from the database and will be used by the report form.',
    loading: 'Loading categories…',
    error: 'Could not load the category list. Start the backend and refresh this page.',
    empty: 'No reportable categories are configured.',
    label: 'Reportable categories'
  },
  report: {
    title: 'Choose the issue location',
    description: 'Use your browser location or place a pin on the map. Nothing is submitted in this step.',
    useMyLocation: 'Use my location',
    locating: 'Finding your location…',
    mapLabel: 'Location picker',
    mapHelp: 'Click the map to place a pin. Drag the pin to adjust it.',
    locationLoading: 'Checking ward and address…',
    locationRequestFailed: 'Could not look up this location. Try moving the pin.',
    permissionDenied: 'Location permission was not available. Please drop a pin on the map instead.',
    unsupported: 'This browser cannot share its location. Please drop a pin on the map instead.',
    outsideTitle: 'Outside the pilot area',
    outsideDescription: 'This location is outside the three sample wards. Move the pin into a sample ward to continue.',
    ward: 'Ward',
    street: 'Street',
    area: 'Area',
    notAvailable: 'Not available',
    wardOnly: 'Address lookup is unavailable, but the ward was found.'
  },
  map: {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    configurationMissing: 'Map configuration is missing.'
  }
};
