# Frontend Service Contract: Base Map Layer Manager (`useGoogleMap`)

This interface contract defines the public methods exposed by `useGoogleMap()` for downstream features (Discover, Heatmap, Catchment Scores, Routes) to interact with the single shared map instance.

---

## 1. Map Initialization & Access

### `initMap(container: HTMLElement, options?: MapInitOptions): Promise<google.maps.Map>`
Initializes or rebinds the single shared Google Maps instance to the specified HTML container element.

```typescript
interface MapInitOptions {
  center?: { lat: number; lng: number };
  zoom?: number;
  useGeolocation?: boolean;
}
```

---

## 2. Marker Layer Methods

### `addMarker(id: string, options: MarkerOptions): google.maps.Marker`
Adds or updates a location pin marker on the shared map instance.

```typescript
interface MarkerOptions {
  position: { lat: number; lng: number };
  title?: string;
  icon?: string | google.maps.Icon;
  onClick?: () => void;
}
```

### `removeMarker(id: string): void`
Removes a specific marker by ID from the map.

### `clearMarkers(): void`
Removes all registered markers from the map.

---

## 3. Polygon / Boundary Methods

### `addPolygon(id: string, options: PolygonOptions): google.maps.Polygon`
Renders an isochrone polygon or boundary overlay on the shared map.

```typescript
interface PolygonOptions {
  paths: Array<{ lat: number; lng: number }>;
  strokeColor?: string;
  fillColor?: string;
  fillOpacity?: number;
}
```

### `removePolygon(id: string): void`
Removes a specific polygon layer by ID.

---

## 4. Heatmap Layer Methods

### `setHeatmapData(id: string, points: Array<{ lat: number; lng: number; weight?: number }>): void`
Renders or updates a density heatmap layer on the shared map.

---

## 5. Viewport Control Methods

### `setCenter(lat: number, lng: number, zoom?: number): void`
Pan and zoom map to specified coordinates.

### `fitBounds(bounds: google.maps.LatLngBounds): void`
Adjusts map viewport bounds to enclose all specified markers/coordinates.
