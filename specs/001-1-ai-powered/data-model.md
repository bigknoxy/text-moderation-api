# Data Model: AI-Powered Text Moderation Platform

## Entities

### 1. UserContent

- **Fields:**
  - content: string
  - timestamp: ISO8601 string
  - userId: string

> Note: Fields like `id` and `language` are planned for future versions, not currently implemented.

### 2. ModerationFlag

- **Fields:**
  - id: string
  - contentId: string
  - flagType: enum ("hate_speech", "offensive_language", "spam")
  - confidence: float (0.0 - 1.0)
  - timestamp: ISO8601 string
  - status: enum ("flagged", "allowed")

### 3. ModeratorAction

- **Fields:**
  - id: string
  - flagId: string
  - actionType: enum ("approve", "reject")
  - moderatorId: string
  - timestamp: ISO8601 string

### 4. AuditLog

- **Fields:**
  - id: string
  - eventType: string
  - actor: string (userId or moderatorId)
  - timestamp: ISO8601 string
  - details: string

## Relationships

- UserContent → ModerationFlag (1:1)
- ModerationFlag → ModeratorAction (0..n)
- All actions/events recorded in AuditLog

## Validation Rules

- UserContent.text must be non-empty, English only
- ModerationFlag.confidence must be between 0.0 and 1.0
- status must be "flagged" if confidence > threshold, else "allowed"
- Only "hate_speech", "offensive_language", "spam" allowed for flagType
