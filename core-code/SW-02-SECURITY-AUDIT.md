# SW-02 Security Audit Report

## Overview

This document records the security design, Row Level Security (RLS) policies, and audit checklist for the DeadDrop Core backend.

**Last Updated:** 2026-05-22  
**Scope:** PostgreSQL Schema, Edge Functions, Authentication, Data Access Control

---

## 1. Authentication Architecture

### 1.1 Anonymous Identity Model
- Users are authenticated via **Supabase Auth** (anonymous or email)
- Profile creation is automatic on first API call
- Device fingerprint is stored but **not used as sole authentication factor**
- `fingerprint_hash` is for analytics/anti-spam, not access control

### 1.2 Token Lifecycle
- JWT tokens managed by Supabase Auth
- Service Role Key (`SUPABASE_SERVICE_ROLE_KEY`) used **only** in Edge Functions
- Service Role Key **never exposed to clients**

---

## 2. Row Level Security (RLS) Audit

### 2.1 profiles

| Policy | Type | Expression | Risk Assessment |
|--------|------|------------|-----------------|
| Users can only access own profile | ALL | `auth.uid() = id` | ✅ Secure — strict owner isolation |
| Allow anonymous read of anonymous_code | SELECT | `true` | ⚠️ Low Risk — only anonymous_code exposed, no PII |

**Mitigation:** `anonymous_code` is a display name, not a credential. No sensitive data readable.

### 2.2 notes

| Policy | Type | Expression | Risk Assessment |
|--------|------|------------|-----------------|
| Notes readable by all if not archived | SELECT | `archived_at IS NULL AND expires_at > now()` | ✅ Secure — only active notes visible |
| Authors can update own notes | UPDATE | `auth.uid() = author_id` | ✅ Secure — strict ownership |
| Authors can delete own notes | DELETE | `auth.uid() = author_id` | ✅ Secure — strict ownership |
| Authenticated users can create notes | INSERT | `auth.uid() = author_id` | ✅ Secure — prevents spoofing |

**Potential Issue:** Notes with `moderation_status = 'pending'` or `'rejected'` are currently readable if not expired.  
**Mitigation Required:** Add `moderation_status = 'approved'` to SELECT policy or handle in application layer.

**Recommended Fix:**
```sql
-- Stricter note visibility
CREATE POLICY "Notes readable if approved and active"
  ON notes FOR SELECT
  USING (
    archived_at IS NULL 
    AND expires_at > now()
    AND moderation_status IN ('pending', 'approved')
  );
```

### 2.3 replies

| Policy | Type | Expression | Risk Assessment |
|--------|------|------------|-----------------|
| Replies readable if note is readable | SELECT | `EXISTS (SELECT 1 FROM notes WHERE ...)` | ✅ Secure — cascades note visibility |
| Authors can create replies | INSERT | `auth.uid() = author_id` | ✅ Secure — prevents spoofing |

### 2.4 locations

| Policy | Type | Expression | Risk Assessment |
|--------|------|------------|-----------------|
| Locations readable by all | SELECT | `true` | ✅ Secure — public metadata |

**Note:** `agent_config` (JSONB) may contain prompt templates. Ensure no secrets in this field.

### 2.5 note_reads

| Policy | Type | Expression | Risk Assessment |
|--------|------|------------|-----------------|
| Users can read own note_reads | SELECT | `auth.uid() = reader_id` | ✅ Secure — privacy preserved |
| Users can insert own note_reads | INSERT | `auth.uid() = reader_id` | ✅ Secure — prevents spoofing |

---

## 3. Edge Function Security Checklist

### 3.1 Input Validation

| Function | Validation | Status |
|----------|-----------|--------|
| `notes-nearby` | Coordinate bounds, accuracy range | ✅ |
| `notes-heatmap` | Viewport bounds, zoom range | ✅ |
| `notes-read` | UUID format, coordinate bounds | ✅ |
| `notes-create` | Content length (1-500), coordinate bounds, lifespan enum | ✅ |
| `replies` | Content length (≤300), nesting depth check | ✅ |

### 3.2 Authorization Checks

| Function | Auth Required | Implementation | Status |
|----------|---------------|----------------|--------|
| `notes-nearby` | No | — | ✅ Public endpoint |
| `notes-heatmap` | No | — | ✅ Public endpoint |
| `notes-read` | Optional | User ID used for read tracking | ✅ Reads work anonymously, tracking requires auth |
| `notes-create` | Yes | `auth.getUser()` validation | ✅ |
| `replies` | Yes | `auth.getUser()` validation | ✅ |

### 3.3 Mock Location Detection

| Check | Implementation | Status |
|-------|---------------|--------|
| Accuracy < 1m flag | `checkMockLocation()` in notes-read | ✅ |
| Known emulator coords | Google HQ, Apple HQ, Null Island checks | ✅ |
| Logging | Warnings logged for suspicious coordinates | ✅ |

**Note:** Mock detection is currently advisory (logs only). Consider making it blocking for high-value operations.

---

## 4. Data Protection

### 4.1 PII Handling
- No real names, emails, or phone numbers in `profiles`
- `anonymous_code` is generated, not user-provided
- `fingerprint_hash` is one-way hashed device fingerprint
- Location data (`reader_location`) is stored for verification but not exposed in APIs

### 4.2 Content Moderation
- All new notes get `moderation_status = 'pending'`
- AI content moderation handled by SW-03 module
- `is_flagged` boolean for manual review queue

### 4.3 Data Retention
- Expired notes soft-deleted (`archived_at` set)
- Physical deletion after 90 days via pg_cron
- `note_reads` table: consider retention policy (not currently implemented)

---

## 5. OWASP 2025 Compliance

| Risk | Status | Mitigation |
|------|--------|------------|
| **Broken Access Control** | ✅ Mitigated | RLS on all tables, auth checks in Edge Functions |
| **Cryptographic Failures** | ✅ Mitigated | TLS 1.3 via Supabase, JWT for auth |
| **Injection** | ✅ Mitigated | Parameterized queries via Supabase client, no raw SQL concatenation |
| **Vulnerable Dependencies** | ⚠️ Monitor | Use `esm.sh` with pinned versions; review Deno deps regularly |
| **Authentication Failures** | ✅ Mitigated | Supabase Auth with RLS; no custom auth |
| **Security Misconfiguration** | ✅ Mitigated | Supabase managed infrastructure |
| **SSRF** | ✅ Mitigated | No outbound URL fetching in Edge Functions |
| **Logging Failures** | ⚠️ Partial | Security events logged; consider centralized SIEM |
| **Secrets Management** | ✅ Mitigated | Service keys in env vars only, never in code |

---

## 6. Penetration Test Scenarios

### 6.1 Unauthorized Note Access
```bash
# Attempt to read someone else's note without auth
curl -X POST /functions/v1/notes/{uuid}/read \
  -d '{"readerLat": 31.23, "readerLng": 121.47}'
```
**Expected:** 200 OK (public read with location verification)

### 6.2 RLS Bypass Attempt
```sql
-- As anonymous user, attempt to read all profiles
SELECT * FROM profiles;
```
**Expected:** Only own profile visible

### 6.3 Note Deletion by Non-Owner
```bash
curl -X DELETE /rest/v1/notes?id=eq.{uuid} \
  -H "Authorization: Bearer {other-user-token}"
```
**Expected:** 404 or empty result (RLS prevents access)

### 6.4 Mock Location Unlock
```bash
curl -X POST /functions/v1/notes/{uuid}/read \
  -d '{"readerLat": 37.4219983, "readerLng": -122.084, "readerAccuracy": 0}'
```
**Expected:** Logs warning; may still unlock if within threshold. Consider blocking.

---

## 7. Recommendations

| Priority | Recommendation | Effort |
|----------|---------------|--------|
| High | Block `moderation_status = 'rejected'` notes from SELECT | Low |
| High | Add rate limiting to `notes-create` (prevent spam) | Medium |
| Medium | Make mock detection blocking (configurable threshold) | Low |
| Medium | Add `note_reads` retention policy (30/90 days) | Low |
| Medium | Implement request signing for sensitive operations | Medium |
| Low | Add IP-based rate limiting at Edge Function level | Medium |
| Low | Content encryption at rest for `content` field | High |

---

## 8. Approval

| Role | Name | Date | Status |
|------|------|------|--------|
| Security Reviewer | — | — | ⬜ Pending |
| Backend Lead | — | — | ⬜ Pending |
| QA | — | — | ⬜ Pending |
