# Eye Map architecture and trust boundaries

## Component diagram

```mermaid
flowchart LR
    U["User browser"] --> MP["Existing MediaPipe precheck"]
    MP --> T["Existing try-on and Face-fit fallback"]
    MP -->|eligible + feature enabled + consent| BFF["Supabase Edge Function / BFF"]
    BFF --> OS["Private object storage"]
    BFF --> Q["Async job boundary"]
    Q --> ML["Replaceable Python ML adapter"]
    ML --> OS
    ML --> DB["Supabase Postgres metadata"]
    BFF --> DB
    BFF --> R["User-safe Eye Map result"]
    R --> U
    U --> A["Allowlisted analytics"]
```

The current frontend never imports the Python package. It talks to a versioned
contract, so the model can be replaced without rewriting the product.

## Data flow

```mermaid
sequenceDiagram
    participant U as User
    participant W as Web app
    participant M as MediaPipe
    participant B as BFF
    participant S as Private storage
    participant P as Python ML

    U->>W: Select or capture photo
    W->>M: Local precheck
    alt precheck fails
        M-->>W: Retake reason
        W-->>U: Retake or continue existing try-on
    else eligible and feature flag on
        W-->>U: Purpose consent
        U->>W: Grant selected purposes
        W->>B: Create session
        B-->>W: Short-lived signed upload URL
        W->>S: Upload directly
        W->>B: Complete session with idempotency key
        B->>P: Queue object key + pinned model version
        P->>S: Read original, write derived assets
        P-->>B: Versioned result or explicit failure
        B-->>W: User-safe result
        W-->>U: Baseline, limitations, next action
    end
```

## State transitions

```mermaid
stateDiagram-v2
    [*] --> Disabled
    Disabled --> Precheck: feature enabled
    Precheck --> Blocked: unsuitable photo
    Blocked --> Precheck: retake
    Blocked --> Fallback: continue without Eye Map
    Precheck --> Consent: eligible
    Consent --> Precheck: declined
    Consent --> Uploading: granted
    Uploading --> Uploading: retry same session
    Uploading --> Queued: complete once
    Queued --> Processing
    Processing --> Succeeded
    Processing --> Partial
    Processing --> Failed
    Processing --> TimedOut
    TimedOut --> Processing: resume
    TimedOut --> Fallback
    Failed --> Precheck: retake
    Failed --> Fallback
    Succeeded --> [*]
    Partial --> [*]
    Fallback --> [*]
```

## Failure codes

The ML adapter must return machine-readable codes. UI copy is resolved in the
web app and never exposes internal stack traces.

| Code | Recoverable | Handling |
| --- | --- | --- |
| `missing_required_structure` | yes | Ask for retake |
| `multiple_faces` | yes | Ask for a one-person photo |
| `mask_sanity_failed` | yes | Do not show derived measurements |
| `unsupported_image` | yes | JPEG/PNG/WebP guidance |
| `model_unavailable` | yes | Existing try-on fallback |
| `schema_incompatible` | no | Disable Eye Map and alert engineering |
| `consent_revoked` | no | Stop and delete by scope |

## Privacy invariants

1. Public buckets are forbidden.
2. Signed URLs are short-lived and purpose-scoped.
3. Original, thumbnail, mask, and overlay are separate assets with deletion
   state.
4. No identity embeddings are generated.
5. Raw images and health-context values never enter analytics, URLs, logs, or
   partner payloads.
6. Model and rule versions are recorded for reproducibility.
