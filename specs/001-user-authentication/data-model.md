# Data Model: User Authentication

## 1. Entities

### User (`users`)

Represents a registered account holder in the system. All application data created by a user is foreign-key scoped to this table.

| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| `id` | UUID | Primary Key, Generated (`uuid_generate_v4()`) | Unique identifier for the user |
| `email` | VARCHAR(255) | Unique, Not Null, Indexed | User's email address used as login identity |
| `password_hash` | VARCHAR(255) | Not Null | Argon2id/bcrypt salted password hash |
| `created_at` | TIMESTAMPTZ | Not Null, Default `CURRENT_TIMESTAMP` | Account creation timestamp |
| `updated_at` | TIMESTAMPTZ | Not Null, Default `CURRENT_TIMESTAMP` | Last profile update timestamp |

### User Session Payload (JWT Claims)

Decoded JWT payload structure representing the active authenticated session.

| Claim | Type | Description |
|-------|------|-------------|
| `sub` | UUID | Subject user ID (corresponds to `users.id`) |
| `email` | String | User's email address |
| `iat` | Number | Issued at timestamp (epoch seconds) |
| `exp` | Number | Expiration timestamp (epoch seconds, +24 hours) |

## 2. Validation Rules

- **Email**:
  - Must be a valid email format (`user@domain.com`).
  - Maximum length: 255 characters.
  - Case-insensitive comparison and storage (normalized to lowercase).
- **Password**:
  - Minimum length: 8 characters.
  - Must contain at least one letter and one number.
  - Plaintext password must never be persisted, logged, or returned in API responses.
- **Password Confirmation**:
  - Must match `password` exactly during registration submission.

## 3. Relationships

- `User` 1 : N `user_locations` (Foreign key `user_id` -> `users.id`, `ON DELETE CASCADE`)
- `User` 1 : 1 `business_type_config` (Foreign key `user_id` -> `users.id`, `ON DELETE CASCADE`)
- `User` 1 : N `saved_queries` (Foreign key `user_id` -> `users.id`, `ON DELETE CASCADE`)

## 4. State Transitions

```
[ Unauthenticated Visitor ]
       │
       ├── (Register with Email/Password) ──► [ User Created & Authenticated ] ──┐
       │                                                                         │
       └── (Login with Credentials) ───────► [ Authenticated Session Active ]   │
                                                    │                            │
                                                    ├── (Logout Action) ─────────┤
                                                    │                            │
                                                    └── (Session Expired / 24h) ─┴─► [ Unauthenticated Visitor ]
```
