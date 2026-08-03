import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface MarkerOptions {
  position: LatLng;
  title?: string;
  label?: string | google.maps.MarkerLabel;
  icon?: string | google.maps.Icon | google.maps.Symbol;
  onClick?: () => void;
}

export interface PolygonOptions {
  paths: LatLng[];
  strokeColor?: string;
  fillColor?: string;
  fillOpacity?: number;
}

const DEFAULT_CENTER: LatLng = { lat: -6.2088, lng: 106.8456 }; // Greater Jakarta / West Java
const DEFAULT_ZOOM = 11;

class GoogleMapService {
  private static instance: GoogleMapService;
  private map: google.maps.Map | null = null;
  private isLoaded = false;
  private loadError: Error | null = null;

  private markers = new Map<string, google.maps.Marker>();
  private polygons = new Map<string, google.maps.Polygon>();

  private constructor() {}

  static getInstance(): GoogleMapService {
    if (!GoogleMapService.instance) {
      GoogleMapService.instance = new GoogleMapService();
    }
    return GoogleMapService.instance;
  }

  private getApiKey(): string {
    const env = (import.meta as unknown as { env: Record<string, string> }).env;
    const apiKey = env?.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
      console.warn('VITE_GOOGLE_MAPS_API_KEY is missing or unconfigured in .env');
    }
    return apiKey || '';
  }

  async loadApi(): Promise<void> {
    if (this.isLoaded && window.google?.maps) return;
    if (this.loadError) throw this.loadError;

    try {
      setOptions({
        key: this.getApiKey(),
        v: 'weekly',
      });
      await importLibrary('maps');
      this.isLoaded = true;
    } catch (err: any) {
      this.loadError = err instanceof Error ? err : new Error('Failed to load Google Maps API');
      throw this.loadError;
    }
  }

  async initMap(container: HTMLElement, center?: LatLng, zoom?: number): Promise<google.maps.Map> {
    await this.loadApi();

    if (!this.map) {
      this.map = new google.maps.Map(container, {
        center: center || DEFAULT_CENTER,
        zoom: zoom || DEFAULT_ZOOM,
        mapTypeControl: true,
        zoomControl: true,
        streetViewControl: false,
        fullscreenControl: false,
      });
    } else {
      // Rebind container if needed without destroying instance
      const parent = this.map.getDiv();
      if (parent !== container) {
        container.appendChild(parent.firstElementChild || parent);
      }
      if (center) {
        this.map.setCenter(center);
      }
    }

    return this.map;
  }

  getMap(): google.maps.Map | null {
    return this.map;
  }

  setCenter(lat: number, lng: number, zoom?: number): void {
    if (this.map) {
      this.map.setCenter({ lat, lng });
      if (zoom !== undefined) {
        this.map.setZoom(zoom);
      }
    }
  }

  // Layer Management Interface
  addMarker(id: string, options: MarkerOptions): google.maps.Marker | null {
    if (!this.map || !window.google?.maps) return null;

    this.removeMarker(id);

    const marker = new google.maps.Marker({
      position: options.position,
      map: this.map,
      title: options.title,
      label: options.label,
      icon: options.icon,
    });

    if (options.onClick) {
      marker.addListener('click', options.onClick);
    }

    this.markers.set(id, marker);
    return marker;
  }

  removeMarker(id: string): void {
    const existing = this.markers.get(id);
    if (existing) {
      existing.setMap(null);
      this.markers.delete(id);
    }
  }

  clearMarkers(): void {
    this.markers.forEach((marker) => marker.setMap(null));
    this.markers.clear();
  }

  addPolygon(id: string, options: PolygonOptions): google.maps.Polygon | null {
    if (!this.map || !window.google?.maps) return null;

    this.removePolygon(id);

    const polygon = new google.maps.Polygon({
      paths: options.paths,
      strokeColor: options.strokeColor || '#3182CE',
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: options.fillColor || '#3182CE',
      fillOpacity: options.fillOpacity ?? 0.25,
      map: this.map,
    });

    this.polygons.set(id, polygon);
    return polygon;
  }

  removePolygon(id: string): void {
    const existing = this.polygons.get(id);
    if (existing) {
      existing.setMap(null);
      this.polygons.delete(id);
    }
  }

  clearAllLayers(): void {
    this.clearMarkers();
    this.polygons.forEach((polygon) => polygon.setMap(null));
    this.polygons.clear();
  }

  triggerResize(): void {
    if (this.map && window.google?.maps) {
      google.maps.event.trigger(this.map, 'resize');
    }
  }
}

export const googleMapService = GoogleMapService.getInstance();
