# Ask ViLu intermittent HTTP 502 after PR #126

Date: 2026-08-29  
Production project: `ygdjkeqdzcibgbuasjak`  
Edge Function: `knowledge-assistant`, version 41, `ACTIVE`  
Source: `origin/main` at `31a9d621b39e81b5f4f3a0fac7f64b4d3430a5e8`

## Scope and safety

This was a read-only investigation. No production configuration, code, migrations,
data, feature flags, or deletion workflows were changed. The reproduction retained
only safe structural diagnostics. It did not retain request or response text,
retrieved passages, credentials, secret values, or provider tokens.

## Verdict

The intermittent 502 is a deterministic fail-closed response to a chat completion
that reaches the configured 1,024 output-token limit. The provider returns a
truncated JSON string with `finishReason=length`; strict JSON parsing correctly
classifies it as `validationFailure=json_syntax`, and the function returns
`provider_unavailable` rather than accepting or repairing incomplete JSON.

This is not a provider HTTP outage, missing secret, retrieval failure, client/mobile
defect, or shared-deadline timeout. Intermittency depends on how long the generated
answer becomes for a particular retrieval/prompt combination.

## Production evidence

The referenced canary recorded 11/12 planned successes, then two consecutive
EN/mobile 502 responses, followed by recovery. A new balanced 12-call read-only
series reproduced the same class of failure:

- 11 responses were HTTP 200 and passed the application contract;
- 1 response was HTTP 502 after 15,633 ms;
- RU and EN both produced successful responses on desktop and mobile;
- no browser-console errors occurred on successful calls.

The reproduced 502 exposed only the intended safe diagnostic:

| Field | Value |
| --- | --- |
| `stage` | `chat` |
| `reason` | `invalid_response` |
| upstream status/code | absent |
| `validationFailure` | `json_syntax` |
| response root/choices/message/content | object / non-empty array / object / string |
| content length | 3,350 characters |
| `finishReason` | `length` |
| `maxTokensReached` | `true` |
| prompt/completion/total tokens | 4,695 / 1,024 / 5,719 |

The exact equality between `completionTokens=1024` and the repository constant
`MAX_CHAT_OUTPUT_TOKENS=1024`, together with `finishReason=length`, establishes the
cause. Because content is a non-null string, the existing retry guard correctly does
not retry it; retry remains reserved for `content=null`.

## Code-path confirmation

PR #126 introduced `temperature=0`, `max_tokens=1024`, and the safe
`finishReason`/`usage`/`maxTokensReached` diagnostic. The deployed version is active.
The current pipeline still:

- uses a shared 18-second server deadline;
- validates model JSON fail-closed;
- limits retries to chat `invalid_response` with `content=null` and enough budget;
- validates every citation quote against the retrieved chunk exactly;
- omits provider messages and content from diagnostics.

Required `KNOWLEDGE_CHAT_*`, `KNOWLEDGE_EMBEDDING_*`, allowed-origin, and rate-limit
secret names are present. Secret values were not read. Successful and failed calls
use the same deployed function and configuration, while the failure reaches the chat
response parser, which rules out missing or stale configuration as its cause.

## Minimal recommended correction

Do not retry, repair, or accept truncated JSON. Keep the current fail-closed parser,
citation validation, deadline, and `content=null`-only retry.

The smallest robust correction is to bound generation size in both the JSON Schema
and system instruction so the valid `ModelAnswer` fits below the output ceiling:

1. Set explicit small maxima for claims and evidence per claim, aligned with the
   short-answer product behavior.
2. Set conservative maximum lengths for claim text and evidence quotes, no larger
   than the existing runtime validation permits.
3. Add contract tests proving the maximum valid object fits within the configured
   output budget for RU and EN, while `finishReason=length` still fails closed.

Simply increasing `max_tokens` is not the preferred first correction: the failed call
already took 15.6 seconds under an 18-second shared deadline, and the runtime contract
currently permits up to 8 claims, 4 evidence objects per claim, 1,200 characters per
claim, and 600 characters per quote. A larger output ceiling can exchange the 502 for
a deadline timeout without removing the unbounded-generation mismatch. A modest
ceiling increase can be evaluated only after the schema is bounded and measured.

## Google Fonts

The canary's intermittent font failures are independent of Ask ViLu. The app loads
Google Fonts through a non-blocking stylesheet preload with `display=swap`, preconnects
to `fonts.googleapis.com` and `fonts.gstatic.com`, and has system-font fallbacks.

From the investigation host, direct requests to the Google Fonts stylesheet timed
out after 20 seconds; the canary likewise identified failures on Google Fonts hosts.
This is evidence of an external network/egress dependency, not application JS or the
Edge Function. It can cause delayed font swap or fallback rendering, but cannot
produce the chat-stage 502.

If eliminating this variance is important, self-host the exact WOFF2 subsets in a
separate performance change. No font change is required to correct the Ask ViLu 502.

## Limitations

Authenticated historical Supabase log comparison was unavailable in the browser
session. The public function diagnostic nevertheless contained every requested safe
field for the reproduced failure and was sufficient to establish the root cause.
Successful public responses intentionally do not expose internal stage telemetry.

## Changes made

The investigation phase was documentation-only. The subsequent local follow-up in
this worktree bounds the generated contract to 2 claims, 1 evidence item per claim,
72 characters per claim, 96 characters per quote, and 48 characters per chunk ID.
The JSON Schema, runtime validation, and system instruction share those limits.
Maximum RU and EN contract fixtures remain below the 1,024-byte conservative output
envelope. Product deployment, configuration, migrations, data, feature flags, and
production state were not changed.
