Build the AI Chat Assistant Panel — the persistent, shared UI surface through which users interact with the AI agent for all AI-driven features in the app (Add Business, Discover, and future agentic features).

Layout:
- A floating panel docked to the right side of the screen, covering roughly 25% of the page width, layered above the Google Map (not replacing or resizing it — the map remains visible and interactive in the remaining space).
- The panel contains a scrollable chat history area (most recent message at the bottom) and a text input with a send action at the bottom of the panel.
- The panel is available from every page/view in the app once the user is logged in, not just a specific feature screen.

Chat history & persistence:
- Every message — both what the user typed and the AI's responses — is persisted to the database, scoped to the logged-in user.
- Reopening the app or refreshing the page restores the user's previous chat history in the panel.
- Chat history is private per user, same data-scoping rule as the rest of the app.

Live process visibility (replaces a generic "loading" spinner):
- While the AI is processing a request, the panel shows real-time, human-readable status updates reflecting what the backend is actually doing at that moment — not a generic "loading, please wait."
- Example sequence for a single user request: "Understanding your request..." → "Determining the right action..." → "Fetching required data..." → "Creating new branch..." → final response.
- These status updates stream to the frontend as they happen on the backend, using Server-Sent Events (SSE) over a streaming HTTP endpoint — chosen over WebSocket because the communication is one-directional (backend pushes status/results, the user's only outbound action is the initial message over a normal request), which fits Cloud Run's request/response model more cleanly and avoids persistent bidirectional connection management.
- If a request fails partway through, the panel shows which step failed in plain language (e.g. "Couldn't find that address — could you clarify?") rather than a raw error or a stuck loading state.

What "done" looks like:
- A logged-in user can open any page, see the chat panel already present, type a message, and watch live status updates stream in before the final response appears.
- Refreshing the page preserves the full chat history for that user.
- The panel never blocks or covers the map — both are usable simultaneously.
- This panel has no AI "skills" of its own yet in this spec — it is the transport and UI layer; what the AI can actually do (add a business, run a discovery search, etc.) is defined in separate feature specs that plug into this panel.

Explicitly out of scope for this feature:
- The actual AI actions/skills (business creation, location discovery, etc.) — those are separate specs
- Multi-session/multi-device chat sync beyond simple persistence-on-reload
- Editing or deleting past chat messages
- File/image upload within the chat