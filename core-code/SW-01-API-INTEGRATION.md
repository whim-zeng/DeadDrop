# SW-01 API Integration Guide

## Backend Endpoints

DeadDrop Mobile App consumes the following SW-02 Edge Functions:

### Notes

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/notes-nearby` | POST | Fetch nearby notes with distance layering |
| `/notes-heatmap` | POST | Fetch heatmap grid aggregation |
| `/notes-read/:id` | POST | Read a note with location verification |
| `/notes-create` | POST | Create a new note |

### Replies

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/replies/:noteId` | GET | List replies for a note |
| `/replies/:noteId` | POST | Create a reply |

### Supabase Realtime

| Channel | Event | Purpose |
|---------|-------|---------|
| `note:{noteId}` | `new_reply` | Real-time reply updates |
| `note:{noteId}` | `presence` | Online viewer count |

## Authentication

All API calls use Supabase Auth JWT (anonymous auth). The `api/client.ts` automatically attaches the session token.

## Error Handling

- Network errors: Retry with exponential backoff
- 403 (distance too far): Show unlock hint with remaining distance
- 401: Redirect to onboarding
- 410 (expired): Show "纸条已过期" message

## Caching Strategy

- Nearby notes: 30s stale time, 60s refetch interval
- Note detail: Cached per session, invalidated on read
- Replies: Real-time via Supabase broadcast + local cache
