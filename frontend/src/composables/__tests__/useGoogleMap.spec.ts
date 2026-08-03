import { describe, it, expect } from 'vitest';
import { useGoogleMap } from '../useGoogleMap';

describe('useGoogleMap', () => {
  it('should initialize with default states', () => {
    const { isLoading, mapError, isGeolocationGranted } = useGoogleMap();

    expect(isLoading.value).toBe(false);
    expect(mapError.value).toBeNull();
    expect(isGeolocationGranted.value).toBe(false);
  });
});
