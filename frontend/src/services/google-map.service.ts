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

export interface HeatmapPoint {
  lat: number;
  lng: number;
  weight: number;
  id?: string;
  name?: string;
  category?: string;
  rating?: number;
  userRatingsTotal?: number;
  businessStatus?: string;
}

export interface RenderHeatmapOptions {
  radius?: number;
  opacity?: number;
  maxIntensity?: number;
  fitBounds?: boolean;
}

export interface CatchmentCircleOptions {
  strokeColor?: string;
  fillColor?: string;
  fillOpacity?: number;
  fitBounds?: boolean;
}

export interface IsochronePolygonOptions {
  strokeColor?: string;
  fillColor?: string;
  fillOpacity?: number;
  fitBounds?: boolean;
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
  private nearbyPoiMarkers: google.maps.Marker[] = [];
  private poiInfoWindow: google.maps.InfoWindow | null = null;
  private activeHeatmapLayer: google.maps.visualization.HeatmapLayer | null = null;
  private fallbackHeatmapCircles: google.maps.Circle[] = [];
  private heatmapHoverMarkers: google.maps.Marker[] = [];
  private heatmapInfoWindow: google.maps.InfoWindow | null = null;
  private activeCatchmentCircle: google.maps.Circle | null = null;
  private activeIsochronePolygon: google.maps.Polygon | null = null;
  private heatmapConstructor: any = null;
  private pendingHeatmap: { points: HeatmapPoint[]; options?: RenderHeatmapOptions } | null = null;
  private pendingCatchmentCircle: { center: LatLng; radiusMeters: number; options?: CatchmentCircleOptions } | null = null;
  private pendingIsochronePolygon: { path: LatLng[]; options?: IsochronePolygonOptions } | null = null;

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

  async loadVisualizationLibrary(): Promise<any> {
    if (this.heatmapConstructor) return this.heatmapConstructor;
    if ((window as any).google?.maps?.visualization?.HeatmapLayer) {
      this.heatmapConstructor = (window as any).google.maps.visualization.HeatmapLayer;
      return this.heatmapConstructor;
    }
    try {
      const visLib: any = await importLibrary('visualization');
      if (visLib && visLib.HeatmapLayer) {
        this.heatmapConstructor = visLib.HeatmapLayer;
        return this.heatmapConstructor;
      }
    } catch (e) {
      console.warn('Visualization library load warning:', e);
    }
    return null;
  }

  async loadApi(): Promise<void> {
    if (!this.isLoaded || !window.google?.maps) {
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

    if (!this.heatmapConstructor) {
      await this.loadVisualizationLibrary();
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
      const currentDiv = this.map.getDiv();
      if (currentDiv && currentDiv !== container && !container.contains(currentDiv)) {
        container.appendChild(currentDiv);
      }
      if (center) {
        this.map.setCenter(center);
      }
    }

    this.triggerResize();

    if (this.pendingHeatmap) {
      const pending = this.pendingHeatmap;
      this.pendingHeatmap = null;
      this.renderHeatmap(pending.points, pending.options);
    }

    if (this.pendingCatchmentCircle) {
      const pending = this.pendingCatchmentCircle;
      this.pendingCatchmentCircle = null;
      this.renderCatchmentCircle(pending.center, pending.radiusMeters, pending.options);
    }

    if (this.pendingIsochronePolygon) {
      const pending = this.pendingIsochronePolygon;
      this.pendingIsochronePolygon = null;
      this.renderIsochronePolygon(pending.path, pending.options);
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

  removeHeatmap(): void {
    if (this.activeHeatmapLayer) {
      try {
        (this.activeHeatmapLayer as any).setMap(null);
      } catch (e) {}
      this.activeHeatmapLayer = null;
    }
    if (this.fallbackHeatmapCircles.length > 0) {
      this.fallbackHeatmapCircles.forEach((c) => c.setMap(null));
      this.fallbackHeatmapCircles = [];
    }
    if (this.heatmapInfoWindow) {
      this.heatmapInfoWindow.close();
      this.heatmapInfoWindow = null;
    }
    if (this.heatmapHoverMarkers.length > 0) {
      this.heatmapHoverMarkers.forEach((m) => m.setMap(null));
      this.heatmapHoverMarkers = [];
    }
  }

  // A fixed blur radius can't work across result sizes: 8px is too sparse-looking for a
  // 5-point result, but a radius sized for that still merges into a solid mass once a dense
  // urban query returns 100+ overlapping POIs (e.g. coffee shops within 5km of central Jakarta).
  // Shrink the radius as point count grows so both ends of that range stay legible.
  private computeAdaptiveHeatmapRadius(pointCount: number): number {
    if (pointCount <= 10) return 16;
    if (pointCount <= 30) return 12;
    if (pointCount <= 80) return 8;
    if (pointCount <= 200) return 5;
    return 3;
  }

  async renderHeatmap(points: HeatmapPoint[], options?: RenderHeatmapOptions): Promise<any> {
    if (!points || points.length === 0) return null;

    if (!this.map || !window.google?.maps) {
      this.pendingHeatmap = { points, options };
      return null;
    }

    // Unregister and destroy existing active heatmap layer (SC-002, FR-007)
    this.removeHeatmap();

    const HeatmapClass = await this.loadVisualizationLibrary();

    if (HeatmapClass) {
      try {
        const weightedData = points.map((p) => {
          const loc = (window as any).google?.maps?.LatLng
            ? new (window as any).google.maps.LatLng(p.lat, p.lng)
            : { lat: p.lat, lng: p.lng };
          return {
            location: loc,
            weight: p.weight > 0 ? p.weight : 1,
          };
        });

        const heatmapConfig: any = {
          data: weightedData,
          map: this.map,
          radius: options?.radius ?? this.computeAdaptiveHeatmapRadius(points.length),
          opacity: options?.opacity ?? 0.6,
        };

        // Leave maxIntensity unset unless the caller explicitly provides one: an explicit low
        // cap (e.g. 8) turns out to saturate to solid red wherever more than ~8 same-category
        // POIs happen to overlap — which is routine in dense urban areas — so most of the map
        // reads as one uniform red blob. Leaving it unset lets the library auto-scale the
        // gradient to this dataset's actual max density, which is what produces real contrast.
        if (options?.maxIntensity !== undefined) {
          heatmapConfig.maxIntensity = options.maxIntensity;
        }

        const heatmap = new HeatmapClass(heatmapConfig);

        this.activeHeatmapLayer = heatmap;
        console.log(`[heatmap] rendered ${points.length} points via HeatmapLayer, radius=${heatmapConfig.radius}px, opacity=${heatmapConfig.opacity}`);
      } catch (e) {
        console.warn('HeatmapLayer instantiation error, rendering fallback density overlay:', e);
        this.renderFallbackHeatmapCircles(points, options);
      }
    } else {
      console.warn('[heatmap] visualization library unavailable — rendering fallback Circle overlay (sized in meters, not tunable via radius/opacity).');
      this.renderFallbackHeatmapCircles(points, options);
    }

    // Auto-fit map viewport bounds to dataset (FR-009)
    if (options?.fitBounds !== false && points.length > 0 && this.map) {
      const bounds = new (window as any).google.maps.LatLngBounds();
      points.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));
      this.map.fitBounds(bounds);

      // fitBounds can over-zoom into a tight, dense cluster to the point the blur radius
      // dwarfs the screen — cap it so the gradient stays readable.
      const mapRef = this.map;
      google.maps.event.addListenerOnce(mapRef, 'bounds_changed', () => {
        if ((mapRef.getZoom() || 0) > 15) {
          mapRef.setZoom(15);
        }
      });
    }

    // The HeatmapLayer gradient itself can't respond to hover — layer small invisible
    // hit-targets per point on top so hovering shows what's actually there.
    this.renderHeatmapHoverMarkers(points);

    return this.activeHeatmapLayer;
  }

  private renderHeatmapHoverMarkers(points: HeatmapPoint[]): void {
    if (!this.map || !window.google?.maps) return;

    this.heatmapInfoWindow = new google.maps.InfoWindow();

    const invisibleIcon: google.maps.Symbol = {
      path: google.maps.SymbolPath.CIRCLE,
      fillOpacity: 0,
      strokeOpacity: 0,
      scale: 10,
    };

    this.heatmapHoverMarkers = points.map((p) => {
      const marker = new google.maps.Marker({
        position: { lat: p.lat, lng: p.lng },
        map: this.map,
        icon: invisibleIcon,
        zIndex: 400,
        optimized: false,
      });

      const ratingText = p.rating ? `★ ${p.rating}${p.userRatingsTotal ? ` (${p.userRatingsTotal} reviews)` : ''}` : 'No rating';
      const catText = (p.category || '').replace(/_/g, ' ').toUpperCase();
      const statusText = p.businessStatus || 'OPERATIONAL';

      const contentString = `
        <div style="padding: 4px 6px; font-family: system-ui; color: #1a202c; max-width: 220px;">
          <div style="font-weight: 700; font-size: 13px; margin-bottom: 2px;">${p.name || 'POI Location'}</div>
          <div style="font-size: 11px; color: #E53E3E; font-weight: 600; margin-bottom: 2px;">${catText}</div>
          <div style="font-size: 11px; color: #718096;">${ratingText} • <span style="color: ${statusText === 'OPERATIONAL' ? '#38A169' : '#E53E3E'}">${statusText}</span></div>
        </div>
      `;

      marker.addListener('mouseover', () => {
        if (this.heatmapInfoWindow && this.map) {
          this.heatmapInfoWindow.setContent(contentString);
          this.heatmapInfoWindow.open(this.map, marker);
        }
      });

      marker.addListener('mouseout', () => {
        if (this.heatmapInfoWindow) {
          this.heatmapInfoWindow.close();
        }
      });

      return marker;
    });
  }

  // Same reasoning as computeAdaptiveHeatmapRadius, but in real-world meters since this path
  // draws actual google.maps.Circle geometry rather than a pixel-space blur layer.
  private computeAdaptiveFallbackRadiusMeters(pointCount: number): number {
    if (pointCount <= 10) return 450;
    if (pointCount <= 30) return 300;
    if (pointCount <= 80) return 210;
    if (pointCount <= 200) return 135;
    return 90;
  }

  private renderFallbackHeatmapCircles(points: HeatmapPoint[], options?: RenderHeatmapOptions): void {
    if (!this.map || !window.google?.maps) return;

    const weights = points.map((p) => p.weight || 1);
    const minWeight = Math.min(...weights);
    const maxWeight = Math.max(...weights);
    // Every point now carries weight: 1 (pure density signal, no fabricated per-point score —
    // see DiscoveryService.generateHeatmapDataset), so minWeight === maxWeight in practice.
    // The old normalized = weight / maxWeight formula degenerates to exactly 1 for every point
    // in that case, which is why every circle rendered at max size/max color with zero variation.
    const hasVariation = maxWeight > minWeight;
    const radiusMeters = this.computeAdaptiveFallbackRadiusMeters(points.length);
    const baseOpacity = options?.opacity ?? 0.45;

    this.fallbackHeatmapCircles = points.map((p) => {
      const normalized = hasVariation
        ? Math.min(1, Math.max(0.1, (p.weight - minWeight) / (maxWeight - minWeight)))
        : 0.6;

      let color = '#3182CE'; // low
      if (normalized > 0.75) {
        color = '#E53E3E'; // high
      } else if (normalized > 0.5) {
        color = '#DD6B20'; // orange
      } else if (normalized > 0.25) {
        color = '#D69E2E'; // yellow
      }

      return new google.maps.Circle({
        strokeColor: color,
        strokeOpacity: 0.25,
        strokeWeight: 1,
        fillColor: color,
        fillOpacity: baseOpacity,
        map: this.map,
        center: { lat: p.lat, lng: p.lng },
        radius: radiusMeters,
        clickable: false,
      });
    });
  }

  removeCatchmentCircle(): void {
    if (this.activeCatchmentCircle) {
      this.activeCatchmentCircle.setMap(null);
      this.activeCatchmentCircle = null;
    }
  }

  renderCatchmentCircle(center: LatLng, radiusMeters: number, options?: CatchmentCircleOptions): google.maps.Circle | null {
    if (!this.map || !window.google?.maps) {
      if (center && radiusMeters > 0) {
        this.pendingCatchmentCircle = { center, radiusMeters, options };
      }
      return null;
    }

    // Unregister and destroy existing active catchment boundary overlays (FR-009, SC-003)
    this.removeCatchmentCircle();
    this.removeIsochronePolygon();

    if (!center || radiusMeters <= 0) return null;

    const circle = new google.maps.Circle({
      strokeColor: options?.strokeColor || '#3182CE',
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: options?.fillColor || '#3182CE',
      fillOpacity: options?.fillOpacity ?? 0.18,
      map: this.map,
      center: { lat: center.lat, lng: center.lng },
      radius: radiusMeters,
      clickable: false,
    });

    this.activeCatchmentCircle = circle;

    if (options?.fitBounds !== false && this.map) {
      this.map.fitBounds(circle.getBounds()!);
    }

    return circle;
  }

  removeIsochronePolygon(): void {
    if (this.activeIsochronePolygon) {
      this.activeIsochronePolygon.setMap(null);
      this.activeIsochronePolygon = null;
    }
  }

  renderIsochronePolygon(path: LatLng[], options?: IsochronePolygonOptions): google.maps.Polygon | null {
    if (!this.map || !window.google?.maps) {
      if (path && path.length > 0) {
        this.pendingIsochronePolygon = { path, options };
      }
      return null;
    }

    // Unregister and destroy existing active spatial boundary overlays (FR-009, Option A clarification)
    this.removeCatchmentCircle();
    this.removeIsochronePolygon();

    if (!path || path.length < 3) return null;

    const polygon = new google.maps.Polygon({
      paths: path,
      strokeColor: options?.strokeColor || '#805AD5',
      strokeOpacity: 0.85,
      strokeWeight: 2,
      fillColor: options?.fillColor || '#805AD5',
      fillOpacity: options?.fillOpacity ?? 0.22,
      map: this.map,
      clickable: false,
    });

    this.activeIsochronePolygon = polygon;

    if (options?.fitBounds !== false && this.map) {
      const bounds = new google.maps.LatLngBounds();
      path.forEach((pt) => bounds.extend({ lat: pt.lat, lng: pt.lng }));
      this.map.fitBounds(bounds);
    }

    return polygon;
  }

  clearNearbyPoiMarkers(): void {
    if (this.poiInfoWindow) {
      this.poiInfoWindow.close();
      this.poiInfoWindow = null;
    }
    this.nearbyPoiMarkers.forEach((marker) => marker.setMap(null));
    this.nearbyPoiMarkers = [];
  }

  renderNearbyPoiMarkers(pois: Array<{ id: string; name: string; category: string; latitude: number; longitude: number; rating?: number; userRatingsTotal?: number; businessStatus?: string; distanceMeters?: number }>): void {
    this.clearNearbyPoiMarkers();

    if (!this.map || !window.google?.maps || !pois || pois.length === 0) return;

    this.poiInfoWindow = new google.maps.InfoWindow();

    const poiMarkerIcon: google.maps.Symbol = {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: '#38A169',
      fillOpacity: 1.0,
      strokeColor: '#FFFFFF',
      strokeWeight: 2,
      scale: 8,
    };

    const bounds = new google.maps.LatLngBounds();

    this.nearbyPoiMarkers = pois.map((poi) => {
      const position = { lat: Number(poi.latitude), lng: Number(poi.longitude) };
      bounds.extend(position);

      const marker = new google.maps.Marker({
        position,
        map: this.map,
        title: poi.name,
        icon: poiMarkerIcon,
        zIndex: 500,
      });

      const ratingText = poi.rating ? `★ ${poi.rating} (${poi.userRatingsTotal || 0} reviews)` : 'No rating';
      const statusText = poi.businessStatus || 'OPERATIONAL';
      const catText = (poi.category || '').replace(/_/g, ' ').toUpperCase();
      const distText = poi.distanceMeters ? ` • ${poi.distanceMeters}m away` : '';

      const contentString = `
        <div style="padding: 4px 6px; font-family: system-ui; color: #1a202c; max-width: 220px;">
          <div style="font-weight: 700; font-size: 13px; margin-bottom: 2px;">${poi.name}</div>
          <div style="font-size: 11px; color: #38A169; font-weight: 600; margin-bottom: 2px;">${catText}${distText}</div>
          <div style="font-size: 11px; color: #718096;">${ratingText} • <span style="color: ${statusText === 'OPERATIONAL' ? '#38A169' : '#E53E3E'}">${statusText}</span></div>
        </div>
      `;

      marker.addListener('mouseover', () => {
        if (this.poiInfoWindow && this.map) {
          this.poiInfoWindow.setContent(contentString);
          this.poiInfoWindow.open(this.map, marker);
        }
      });

      marker.addListener('mouseout', () => {
        if (this.poiInfoWindow) {
          this.poiInfoWindow.close();
        }
      });

      return marker;
    });

    if (pois.length > 0 && this.map) {
      this.map.fitBounds(bounds);
    }
  }

  clearAllLayers(): void {
    this.clearMarkers();
    this.clearNearbyPoiMarkers();
    this.removeHeatmap();
    this.removeCatchmentCircle();
    this.removeIsochronePolygon();
    this.polygons.forEach((polygon) => polygon.setMap(null));
    this.polygons.clear();
  }

  setCenterAndZoom(center: LatLng, zoom = 16): void {
    if (this.map && window.google?.maps) {
      this.map.setCenter({ lat: center.lat, lng: center.lng });
      this.map.setZoom(zoom);
    }
  }

  triggerResize(): void {
    if (this.map && window.google?.maps) {
      google.maps.event.trigger(this.map, 'resize');
    }
  }
}

export const googleMapService = GoogleMapService.getInstance();
