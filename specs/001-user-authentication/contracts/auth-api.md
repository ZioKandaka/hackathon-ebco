# OpenAPI Specification: Authentication API (`/auth`)

Base URL: `/api/v1/auth`

---

## 1. `POST /api/v1/auth/register`

Creates a new user account and returns an authentication session token/cookie.

### Request Body (`application/json`)

```json
{
  "email": "user@example.com",
  "password": "SecurePassword123",
  "passwordConfirm": "SecurePassword123"
}
```

### Validation Constraints
- `email`: string, valid email format, required
- `password`: string, min 8 chars, required
- `passwordConfirm`: string, must match `password`, required

### Responses

#### `201 Created`
Account registered successfully; session initialized.

Set-Cookie: `access_token=<JWT>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=86400`

```json
{
  "user": {
    "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    "email": "user@example.com",
    "createdAt": "2026-08-03T10:00:00.000Z"
  }
}
```

#### `400 Bad Request`
Validation failed (e.g. passwords do not match, weak password).

```json
{
  "statusCode": 400,
  "message": [
    "passwordConfirm must match password",
    "password must be longer than or equal to 8 characters"
  ],
  "error": "Bad Request"
}
```

#### `409 Conflict`
Email already registered.

```json
{
  "statusCode": 409,
  "message": "Email address is already in use.",
  "error": "Conflict"
}
```

---

## 2. `POST /api/v1/auth/login`

Authenticates a user with email and password.

### Request Body (`application/json`)

```json
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

### Responses

#### `200 OK`
Login successful; session initialized.

Set-Cookie: `access_token=<JWT>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=86400`

```json
{
  "user": {
    "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    "email": "user@example.com",
    "createdAt": "2026-08-03T10:00:00.000Z"
  }
}
```

#### `401 Unauthorized`
Invalid credentials (generic message to avoid email enumeration).

```json
{
  "statusCode": 401,
  "message": "Invalid email or password.",
  "error": "Unauthorized"
}
```

---

## 3. `POST /api/v1/auth/logout`

Terminates the active session and clears authentication cookies.

### Headers / Cookies
- Cookie: `access_token=<JWT>`

### Responses

#### `200 OK`
Logout successful.

Set-Cookie: `access_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`

```json
{
  "message": "Successfully logged out."
}
```

---

## 4. `GET /api/v1/auth/me`

Retrieves the currently authenticated user's profile based on active session token.

### Headers / Cookies
- Cookie: `access_token=<JWT>` or `Authorization: Bearer <JWT>`

### Responses

#### `200 OK`

```json
{
  "user": {
    "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    "email": "user@example.com",
    "createdAt": "2026-08-03T10:00:00.000Z"
  }
}
```

#### `401 Unauthorized`
Missing or expired session token.

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```
