import { ref } from 'vue';
import {
  googleMapService,
  LatLng,
  MarkerOptions,
  PolygonOptions,
} from '../services/google-map.service';

export function useGoogleMap() {
  const isLoading = ref(false);
  const mapError = ref<string | null>(null);
  const isGeolocationGranted = ref(false);

  async function requestUserGeolocation(): Promise<LatLng | null> {
    if (!navigator.geolocation) return null;

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          isGeolocationGranted.value = true;
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          isGeolocationGranted.value = false;
          resolve(null);
        },
        { timeout: 5000 }
      );
    });
  }

  async function initMap(container: HTMLElement, options?: { zoom?: number }): Promise<void> {
    isLoading.value = true;
    mapError.value = null;

    try {
      const userCoords = await requestUserGeolocation();
      await googleMapService.initMap(container, userCoords || undefined, options?.zoom);
    } catch (err: any) {
      mapError.value = err.message || 'Could not load Google Maps API. Please verify network or API key.';
    } finally {
      isLoading.value = false;
    }
  }

  function addMarker(id: string, options: MarkerOptions) {
    return googleMapService.addMarker(id, options);
  }

  function removeMarker(id: string) {
    googleMapService.removeMarker(id);
  }

  function clearMarkers() {
    googleMapService.clearMarkers();
  }

  function addPolygon(id: string, options: PolygonOptions) {
    return googleMapService.addPolygon(id, options);
  }

  function removePolygon(id: string) {
    googleMapService.removePolygon(id);
  }

  function clearAllLayers() {
    googleMapService.clearAllLayers();
  }

  function setCenter(lat: number, lng: number, zoom?: number) {
    googleMapService.setCenter(lat, lng, zoom);
  }

  function triggerResize() {
    googleMapService.triggerResize();
  }

  return {
    isLoading,
    mapError,
    isGeolocationGranted,
    initMap,
    addMarker,
    removeMarker,
    clearMarkers,
    addPolygon,
    removePolygon,
    clearAllLayers,
    setCenter,
    triggerResize,
  };
}
