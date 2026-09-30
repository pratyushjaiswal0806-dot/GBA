import { useRef, useState } from 'react';
import { requestJson } from '../api/client.js';
import { text } from '../i18n/en.js';

const geolocationTimeoutMs = 10_000;

export function useLocationPicker({ onPositionChange }) {
  const [position, setPosition] = useState(null);
  const [location, setLocation] = useState(null);
  const [isResolving, setIsResolving] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState(null);
  const controllerRef = useRef(null);

  async function resolvePosition(nextPosition) {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setPosition(nextPosition);
    setLocation(null);
    setError(null);
    setIsResolving(true);
    onPositionChange?.();

    try {
      const result = await requestJson('/api/locations/resolve', {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextPosition)
      });

      if (!controller.signal.aborted) setLocation(result);
    } catch (requestError) {
      if (requestError.name !== 'AbortError') {
        setError(requestError.message || text.report.locationRequestFailed);
      }
    } finally {
      if (!controller.signal.aborted) setIsResolving(false);
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError(text.report.unsupported);
      return;
    }

    setError(null);
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setIsLocating(false);
        resolvePosition({ lat: coords.latitude, lng: coords.longitude });
      },
      () => {
        setIsLocating(false);
        setError(text.report.permissionDenied);
      },
      { enableHighAccuracy: true, timeout: geolocationTimeoutMs }
    );
  }

  function reset() {
    controllerRef.current?.abort();
    setPosition(null);
    setLocation(null);
    setError(null);
    setIsResolving(false);
  }

  return { position, location, isResolving, isLocating, error, resolvePosition, useMyLocation, reset };
}
