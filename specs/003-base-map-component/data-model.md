# Data Model: Base Map Component

## 1. Entities & In-Memory State

### Base Map State (`MapState`)

In-memory singleton state representing the global base map instance and configuration.

| Field Name | Type | Description |
|------------|------|-------------|
| `isLoaded` | Boolean | `true` when Google Maps JavaScript API script is loaded |
| `isLoading` | Boolean | `true` during active script or map initialization |
| `error` | String \| Null | Error message if Google Maps script fails to load |
| `center` | `{ lat: number, lng: number }` | Current map center coordinates |
| `zoom` | Number | Current zoom level (default `11`) |
| `mapInstance` | `google.maps.Map \| null` | Native Google Maps instance reference |

### Registered Map Overlay (`MapOverlayItem`)

Internal registry entry for layers attached to the shared base map instance.

| Field Name | Type | Description |
|------------|------|-------------|
| `id` | String | Unique layer or marker identifier |
| `type` | `'marker' \| 'polygon' \| 'heatmap'` | Overlay element type |
| `nativeInstance` | `google.maps.Marker \| google.maps.Polygon \| google.maps.visualization.HeatmapLayer` | Native Google Maps API overlay object |

## 2. Default Configuration Constants

- **Fallback Center**: Greater Jakarta / West Java (`{ lat: -6.2088, lng: 106.8456 }`)
- **Default Zoom Level**: `11`
- **Supported Controls**: Zoom Control, MapType Control (Roadmap / Satellite), Scale Control, Fullscreen Control

## 3. State Lifecycle

```
[ App Launch / Route Load ]
           │
           ▼
[ Check if Google Maps API Loaded ]
           │
           ├── (No) ──► Execute @googlemaps/js-api-loader ──► [ Script Loaded ]
           │                                                       │
           └── (Yes) ──────────────────────────────────────────────┤
                                                                   │
                                                                   ▼
                                                   [ Bind Container & Init Map ]
                                                                   │
                                           ┌───────────────────────┴───────────────────────┐
                                           │                                               │
                                           ▼                                               ▼
                              [ Check Browser Geolocation ]                       [ On API Error ]
                                           │                                               │
                       ┌───────────────────┴───────────────────┐                           ▼
                       ▼                                       ▼                  [ Render Map Error ]
             (Granted: Center User)                 (Denied: Default Center)
```
