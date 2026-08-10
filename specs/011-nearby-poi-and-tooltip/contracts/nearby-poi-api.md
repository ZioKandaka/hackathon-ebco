# Interface Contracts: Nearby POI Pins & Hover Tooltips

## 1. Backend Service Contract (`bigquery-discovery.service.ts`)

```typescript
export interface BigQueryDiscoveryService {
  /**
   * Returns relevant display categories for a business vertical.
   */
  getRelevantDisplayCategoriesForType(businessType: string): string[];

  /**
   * Queries POIs within a specified radius (meters), filtered by relevant categories.
   */
  queryPoisWithinRadius(
    lat: number,
    lng: number,
    radiusMeters: number,
    regencyOrProvince?: string,
    relevantCategories?: string[],
  ): Promise<RadiusPoiItem[]>;
}
```

---

## 2. Frontend Map Service Contract (`google-map.service.ts`)

```typescript
export interface NearbyPoiMarkerOptions {
  iconUrl?: string; // Default: cyan dot marker
}

export interface IGoogleMapService {
  /**
   * Renders nearby POI markers on the map with mouseover/mouseout hover tooltips.
   * Clears any previously active nearby POI markers before rendering (SC-004).
   */
  renderNearbyPoiMarkers(
    pois: RadiusPoiItem[],
    options?: NearbyPoiMarkerOptions,
  ): void;

  /**
   * Clears and unregisters all active nearby POI markers and tooltips from the map.
   */
  clearNearbyPoiMarkers(): void;
}
```
