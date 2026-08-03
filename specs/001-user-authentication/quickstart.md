# Quickstart & Manual Validation Guide: User Authentication

This guide describes end-to-end scenarios to manually verify the user authentication feature.

## Prerequisites

1. PostgreSQL database running locally or Cloud SQL Proxy connected.
2. Backend NestJS app running on `http://localhost:3000` (or `PORT` configured in `.env`).
3. Frontend Vue 3 app running on `http://localhost:5173`.

---

## Scenario 1: New User Registration & Automatic Login

**Goal**: Verify that a visitor can create an account and is immediately signed in.

1. Open browser to `http://localhost:5173`.
2. Observe automatic redirection to `/login` or `/register` option since user is unauthenticated.
3. Click **Register**.
4. Enter:
   - Email: `testuser@example.com`
   - Password: `Password123`
   - Password Confirmation: `Password123`
5. Click **Create Account**.
6. **Expected Outcome**:
   - Account created in PostgreSQL `users` table.
   - User is logged in automatically and redirected to the application homepage (`/` or `/discover`).
   - Main navigation displays active user email (`testuser@example.com`) and a **Log out** button.

---

## Scenario 2: Duplicate Email Registration Prevention

**Goal**: Verify that registering with an existing email is rejected.

1. Log out or open an incognito browser window at `http://localhost:5173/register`.
2. Enter the same email used in Scenario 1: `testuser@example.com`.
3. Enter Password: `Password123` and Confirmation: `Password123`.
4. Click **Create Account**.
5. **Expected Outcome**:
   - Registration fails.
   - Form displays error message: `"Email address is already in use."`
   - User is not signed in and stays on registration screen.

---

## Scenario 3: Login with Invalid Credentials

**Goal**: Verify security-compliant failure message on invalid login.

1. Navigate to `http://localhost:5173/login`.
2. Enter `testuser@example.com` with incorrect password `WrongPassword!`.
3. Click **Log In**.
4. **Expected Outcome**:
   - Login fails.
   - Generic error message displayed: `"Invalid email or password."` (does not leak email existence).

---

## Scenario 4: Successful Login & Session Persistence

**Goal**: Verify login and session persistence across page refreshes.

1. On `http://localhost:5173/login`, enter:
   - Email: `testuser@example.com`
   - Password: `Password123`
2. Click **Log In**.
3. Observe redirection to main app view.
4. Refresh browser page (`F5` or `Cmd+R`).
5. **Expected Outcome**:
   - Session remains active (token validated via `/auth/me`).
   - User stays on protected page without being prompted to log in again.

---

## Scenario 5: Protected Route Access & Logout

**Goal**: Verify navigation guard enforcement and logout behavior.

1. Click **Log out** in main navigation bar.
2. Observe redirection to `/login`.
3. Try typing `http://localhost:5173/discover` directly into browser URL bar.
4. **Expected Outcome**:
   - Router navigation guard intercepts unauthenticated request.
   - User is immediately redirected back to `/login`.
