# Feature Specification: Add Business/Branch AI Skill

**Feature Branch**: `004-add-business-branch`

**Created**: 2026-08-03

**Status**: Draft

**Input**: User description: "@original-prompt/add-branch.md"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Conversational Branch Registration (Priority: P1) 🎯 MVP

As an authenticated user, I want to add a new business or branch location by typing a natural-language request in the AI Chat Assistant Panel so that I can register my locations without filling out manual web forms.

**Why this priority**: "Add Business/Branch" is the foundational AI skill that registers user-owned location data into the platform for all subsequent analysis features (Catchment Scoring, Accessibility, Heatmaps).

**Independent Test**: Can be fully tested by typing an address and business details in the AI chat panel, observing live status updates, receiving an AI confirmation summary, and confirming that a new user-scoped location record is created and rendered as a pin on the shared Google Map.

**Acceptance Scenarios**:

1. **Given** an authenticated user in the chat panel, **When** they type a complete request containing business name, business type, and address (e.g., "Add my coffee shop branch at Jl. Sudirman No. 10, Kota Bekasi called Sudirman Coffee"), **Then** the system geocodes the address, creates a user-scoped location record, streams real-time status updates, and returns a confirmation message.
2. **Given** a successfully registered new branch location, **When** the AI responds with confirmation, **Then** a new location pin is immediately added to the shared Google Map instance, centered on the resolved latitude/longitude, and the location appears in the user's "My Locations" list.
3. **Given** a chat request missing the business name or type (e.g., "Add a location at Jl. Gatot Subroto No. 5"), **When** the backend processes the message, **Then** the AI asks a short, concise follow-up question in the chat to collect the missing information before persisting the record.

---

### User Story 2 - Geocoding Ambiguity & Candidate Confirmation (Priority: P2)

As a user providing a vague or partial address, I want the AI to present the top matching address candidates in the chat so that I can select or confirm the correct location before it is saved.

**Why this priority**: Prevents silent wrong guesses and guarantees geographic coordinate accuracy for candidate locations.

**Independent Test**: Can be fully tested by submitting a vague or multi-match address (e.g., "Sudirman"), observing the AI return a list of top candidate addresses in the chat stream, replying with the desired option, and confirming the selected coordinate is saved.

**Acceptance Scenarios**:

1. **Given** a user request with an ambiguous address yielding multiple top geocoding matches, **When** the geocoding step completes, **Then** the AI lists the top candidate addresses in the chat and asks the user to confirm or choose the correct option.
2. **Given** candidate address options presented in the chat, **When** the user selects or confirms an option, **Then** the system completes registration with the chosen coordinates and updates the map view.

---

### User Story 3 - Duplicate Address Detection & User Choice (Priority: P3)

As a user registering a branch, I want to be warned if a very similar address is already registered in my account so that I don't accidentally create duplicate location records.

**Why this priority**: Protects data integrity and prevents duplicate records in the user's location portfolio.

**Independent Test**: Can be fully tested by submitting an address nearly identical to an existing saved location, verifying that the AI notes the potential duplicate in the chat, and selecting whether to proceed creating a new branch or update the existing record.

**Acceptance Scenarios**:

1. **Given** an address submission matching an existing location in the user's account, **When** duplicate check is evaluated, **Then** the AI alerts the user in the chat that a similar location exists and prompts them to confirm whether to add a new location or treat it as an update.
2. **Given** the duplicate confirmation prompt, **When** the user confirms adding a new location, **Then** the system registers the new location record independently.

---

### Edge Cases

- What happens if the Google Geocoding API fails to find any matching result for an address? The AI informs the user in plain language (e.g. "Couldn't find that address — could you check the spelling or provide a nearby landmark?") and prompts for clarification without raising raw errors.
- How does the system handle addresses with low geocoding confidence? The location record flags low-confidence geocodes and asks the user for a nearby landmark or sub-district clarification in the chat.
- What happens if a user submits whitespace or an irrelevant non-location message to the Add Branch skill? The AI politely clarifies that it is an assistant for location intelligence and guides the user to provide location details.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST process natural-language user requests to create or add a new business location through the AI Chat Assistant Panel interface.
- **FR-002**: System MUST stream real-time, human-readable status updates (e.g., "Determining the right action...", "Looking up that address...", "Creating your new branch...") over the SSE chat connection during skill execution.
- **FR-003**: System MUST resolve user-provided addresses to latitude, longitude, and normalized administrative components (province, city/regency, sub-district, postal code) via the Google Geocoding API.
- **FR-004**: System MUST ask a short follow-up question in the chat if required business attributes (name or business type) are missing, instead of guessing silently.
- **FR-005**: System MUST persist the new location record in the PostgreSQL `user_locations` table, strictly foreign-key bound to the authenticated user's ID.
- **FR-006**: System MUST immediately render a new location pin on the single shared Google Map instance and center the viewport on the newly created coordinates upon successful creation.
- **FR-007**: System MUST immediately make the new location visible in the "My Locations" list view.
- **FR-008**: System MUST present candidate address options in the chat for ambiguous or multi-match addresses and await user confirmation before persisting.
- **FR-009**: System MUST detect duplicate or near-identical addresses registered under the same user account and ask for user confirmation in the chat before saving.

### Key Entities

- **User Location (`user_locations`)**: Represents a registered business or branch location belonging to a user. Attributes include unique location ID, user ID, business name, business type/category, full address, normalized administrative components (province, regency/city, sub-district, postal code), latitude, longitude, geocoding confidence score, and creation timestamp.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Logged-in users can complete a conversational branch addition in under 30 seconds from initial chat request to map pin placement.
- **SC-002**: 100% of newly registered locations appear as pins on the single shared Google Map and in the "My Locations" list without requiring page reloads.
- **SC-003**: 100% of persisted location records are strictly scoped to the authenticated user ID with zero cross-user leakage.
- **SC-004**: 100% of ambiguous address responses or geocoding failures result in plain-language clarifying questions rather than unhandled raw errors or incorrect silent saves.

## Assumptions

- **Chat Panel Surface**: The AI Chat Assistant Panel (`002-ai-chat-panel`) serves as the primary conversational UI for invoking and interacting with this skill.
- **Base Map Surface**: The single shared Google Map instance (`003-base-map-component`) is used to render new location pins.
- **Geocoding Service**: Google Geocoding API is used on the backend to resolve address strings into geographic coordinates and structured address components.
- **Out of Scope**: Editing or deleting existing location records, bulk CSV/Excel import of multiple locations, and manual pin-dropping on the map are explicitly out of scope for this feature specification.
