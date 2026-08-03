# Data Model: AI Chat Assistant Panel

## 1. Entities

### Chat Message (`chat_messages`)

Represents a persisted message or AI response in a user's conversation history.

| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| `id` | UUID | Primary Key, Generated (`uuid_generate_v4()`) | Unique message identifier |
| `user_id` | UUID | Foreign Key -> `users.id`, Not Null, Indexed | User owner ID |
| `sender` | VARCHAR(20) | Not Null, Enum: `'user'`, `'assistant'`, `'system_status'` | Message sender role |
| `content` | TEXT | Not Null | Message body or status text |
| `created_at` | TIMESTAMPTZ | Not Null, Default `CURRENT_TIMESTAMP`, Indexed | Timestamp when message was created |

## 2. Ephemeral Types (Non-Persisted Streaming Event)

### SSE Stream Event Payload (`ChatStreamEvent`)

Real-time progress update event emitted over the Server-Sent Events HTTP stream.

```typescript
type SSEEventType = 'status' | 'message' | 'error' | 'done';

interface ChatStreamEvent {
  type: SSEEventType;
  step?: string;        // Human-readable status update (e.g., "Understanding your request...")
  content?: string;     // Final AI message content when type === 'message'
  error?: string;       // Failure explanation when type === 'error'
  timestamp: string;    // ISO timestamp
}
```

## 3. Relationships

- `User` 1 : N `chat_messages` (Foreign key `user_id` -> `users.id`, `ON DELETE CASCADE`)

## 4. State Transitions

```
[ User Enters Message ]
        │
        ▼
[ Persist User Message to DB ]
        │
        ▼
[ Open SSE Stream Route ]
        │
        ├── Emit Status Event 1 ("Understanding request...") ──► Update UI Status Card
        ├── Emit Status Event 2 ("Determining action...")  ──► Update UI Status Card
        ├── Emit Status Event 3 ("Fetching data...")       ──► Update UI Status Card
        │
        ├── (On Success) ──► Emit Message Event ("Here is...") ──► Persist AI Message to DB
        │                                                     └── Render Assistant Card
        │
        └── (On Error)   ──► Emit Error Event ("Could not...") ──► Render Plain Error Card
```
