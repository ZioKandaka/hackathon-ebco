# Data Model: Add Business/Branch AI Skill

## 1. Entities

### User Location (`user_locations`)

Represents a registered business or branch location belonging to an authenticated user.

| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| `id` | UUID | Primary Key, Generated (`uuid_generate_v4()`) | Unique location identifier |
| `user_id` | UUID | Foreign Key -> `users.id`, Not Null, Indexed | User owner ID |
| `name` | VARCHAR(255) | Not Null | Business or branch name (e.g., "Sudirman Coffee") |
| `business_type` | VARCHAR(100) | Not Null, Indexed | Business category (e.g., "coffee_shop", "retail", "bank") |
| `full_address` | TEXT | Not Null | Formatted full address returned by geocoding |
| `province` | VARCHAR(100) | Nullable | Province name or code |
| `regency` | VARCHAR(100) | Nullable | Regency or city name |
| `sub_district` | VARCHAR(100) | Nullable | Sub-district name |
| `postal_code` | VARCHAR(20) | Nullable | Postal code |
| `latitude` | DECIMAL(10, 7) | Not Null | Resolved latitude coordinate |
| `longitude` | DECIMAL(10, 7) | Not Null | Resolved longitude coordinate |
| `confidence` | FLOAT | Default `1.0` | Geocoding confidence score (0.0 to 1.0) |
| `created_at` | TIMESTAMPTZ | Not Null, Default `CURRENT_TIMESTAMP` | Location creation timestamp |

## 2. Ephemeral Types

### Geocoding Result Candidate

```typescript
interface GeocodingCandidate {
  formattedAddress: string;
  latitude: number;
  longitude: number;
  province?: string;
  regency?: string;
  subDistrict?: string;
  postalCode?: string;
  confidence: number;
}
```

## 3. Relationships

- `User` 1 : N `user_locations` (Foreign key `user_id` -> `users.id`, `ON DELETE CASCADE`)

## 4. State Transitions for Branch Creation

```
[ User Prompt in Chat ]
          │
          ▼
[ Parse Name, Type, Address ]
          │
          ├── (Missing Name or Type) ──► Prompt User in Chat for Missing Attribute ──┐
          │                                                                           │
          └── (Complete Details) ─────────────────────────────────────────────────────┤
                                                                                      │
                                                                                      ▼
                                                                        [ Geocode Address via API ]
                                                                                      │
                       ┌──────────────────────────────────────────────────────────────┴──────────────────────────────────────────────────────────────┐
                       │                                                                                                                             │
                       ▼                                                                                                                             ▼
            (Single Precise Match)                                                                                                         (Ambiguous / Multiple Matches)
                       │                                                                                                                             │
                       ▼                                                                                                                             ▼
           [ Check for Duplicate Address ]                                                                                         [ Present Candidate List in Chat ]
                       │                                                                                                                             │
           ┌───────────┴───────────┐                                                                                                         ▼
           ▼                       ▼                                                                                               [ Await User Selection ]
    (Unique Address)      (Duplicate Detected)                                                                                               │
           │                       │                                                                                                         │
           │                       ▼                                                                                                         │
           │            [ Prompt User in Chat ]                                                                                              │
           │                       │                                                                                                         │
           └───────────────────────┴─────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                                                      │
                                                                                      ▼
                                                                       [ Persist to user_locations ]
                                                                                      │
                                                                                      ▼
                                                                  [ Add Pin to Google Map & Update View ]
```
