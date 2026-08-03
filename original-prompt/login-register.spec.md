Build authentication for the location intelligence app using standard email and password registration and login — a regular, self-contained auth system, not third-party OAuth.

User flow — Registration:
- A new visitor sees a "Register" option alongside "Login" before accessing any feature.
- User provides email, password, and password confirmation.
- Password must meet reasonable strength requirements (minimum length, not trivially weak).
- On successful registration, the app creates a new user record and the user is signed in immediately (or redirected to login — decide the more standard convention).
- If the email is already registered, the user gets a clear error rather than a silent failure or duplicate account.

User flow — Login:
- User provides email and password on the login screen.
- On success, the user is authenticated and redirected into the app.
- On failure (wrong password, unknown email), the user gets a clear, generic error message that does not reveal whether the email exists (standard security practice — don't leak which part was wrong).

Session handling:
- Once logged in, the user stays authenticated across page reloads until they explicitly log out or the session/token expires.
- A "Log out" action is available from the app's main navigation and clears the session.
- Sessions use a reasonable expiry (e.g. token-based, refreshable), not an indefinitely-lived token.

Password security:
- Passwords are never stored in plain text — they are hashed with a strong, modern hashing algorithm (e.g. bcrypt or argon2) with proper salting, before being persisted.
- Passwords are never logged, returned in API responses, or exposed in error messages.

Data scoping:
- Every registered user has a unique user ID that all their data (saved business locations, business profile/type setting, future saved queries) is scoped to.
- Users can only ever see and modify their own locations and profile — never another user's data.
- Unauthenticated visitors are redirected to the login screen if they try to access any feature (Discover, Heatmap, My Locations, etc.) — the app is not usable without logging in first.

What "done" looks like:
- A user can register, log out, and log back in successfully with the same credentials.
- Passwords are verifiably hashed in the database, never stored or transmitted in plain text after the initial submission.
- Attempting to access any app feature while logged out redirects to login.
- Attempting to register with an already-used email is rejected with a clear message.

Explicitly out of scope for this feature (can be separate future specs if needed):
- Password reset / "forgot password" flow
- Email verification
- Multi-factor authentication
- Third-party OAuth login (Google, etc.)
- Role-based permissions or admin roles — every registered user has the same access level for now
- Account deletion/data export flows