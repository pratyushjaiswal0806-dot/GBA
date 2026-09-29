const streetKeys = ['road', 'pedestrian', 'footway', 'residential', 'path'];
const areaKeys = ['neighbourhood', 'suburb', 'city_district', 'quarter', 'village', 'town', 'city'];

function firstAddressValue(address, keys) {
  return keys.map((key) => address?.[key]).find((value) => typeof value === 'string' && value.trim()) ?? null;
}

export function createCoordinateCacheKey({ lat, lng }) {
  return `${lat.toFixed(5)},${lng.toFixed(5)}`;
}

export function selectAddressFields(address) {
  return {
    street: firstAddressValue(address, streetKeys),
    area: firstAddressValue(address, areaKeys)
  };
}
