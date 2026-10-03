# Elevate.Elly

**Checked out:** `main` @ `a8988bb8`. Python FastAPI RAG chatbot (“Elly”) for Elevate Golf — OpenRouter/LangChain LLM, FAISS, Mongo session store, WebSocket streaming. Feeds [[19-AI-Assistant]], Phase 16 (hackathon path may stub UI earlier).

## Architecture

FastAPI app (`main.py`) registers routers from `routes/`, initializes services in `core/dependencies.py` on startup. Unified pipeline in `ChatOrchestrator`: intent → PII scrub → memory/summary → RAG → LLM (+ tools) → guardrail validate. Dual transport: `POST /elly/chat` (full response) and `WS /elly/ws/{session_id}` (typed stream events). Tools call Elevate.Server HTTP or read app MongoDB. Python, not Node — **pattern only** for Arambh AI module.

## Folder structure

```
Elevate.Elly/
├── main.py
├── config/settings.py
├── core/
│   ├── chat_orchestrator.py
│   ├── dependencies.py
│   └── session_manager.py
├── modules/          # intent, memory, rag, guardrails, profile_*
├── routes/           # chat, tips, profile, sessions, health, internal, coach_recommendation
├── services/         # llm, mongo, tools, faiss, s3, prompt, db
├── utils/models.py   # Pydantic request/response
├── Data/             # seed docs for FAISS
├── scripts/
├── requirements.txt
└── Dockerfile
```

## Patterns worth copying

| Path | What | Where in Arambh |
|---|---|---|
| `core/chat_orchestrator.py` | Single orchestrator for HTTP + WS; `process_message` / `process_message_stream` | `server` AI module service (Phase 16) — call domain services, never raw models from AI |
| Stream event types `stream_start` / `stream_chunk` / `stream_end` / `stream_error` | Client-parseable protocol | Mobile/admin chat clients + AI gateway |
| `utils/models.py` `ChatRequest`/`ChatResponse` | session_id, suggestions, ticket_id, structured_data | Shared AI DTO (zod on Node side) |
| `modules/guardrails.py` | PII scrub + forbidden phrases; CMS-loaded with defaults | AI safety layer before/after LLM |
| `modules/memory_manager.py` | Entities + rolling summary | Conversation compression |
| `modules/intent_classifier.py` | LLM + heuristic intents (complaint, coach rec, navigation) | Route to tools / skip RAG for greetings |
| `services/tool_service.py` | LangChain `@tool` → REST with user Bearer + fallbacks | Tools must hit Booking/Inventory/Finance **services** or REST, not Mongoose |
| `routes/sessions.py` | List/delete sessions by `user_id` | Conversation sidebar API |

## Reusable components

N/A (API-only). Client rendering lives in Elevate.Application (`Elly*` components). Protocol contract to reuse: suggestions chips, `structured_data` for rich cards / navigation actions, ticket_id side channel.

## Reusable services

- `services/llm_service.py` — multi-provider generate + stream; tool-call phase then stream text.
- `services/mongo_service.py` / `services/db.py` — session upsert, indexes on `session_id` / `user_id`.
- `services/tool_service.py` — departments, tips, tickets, coach search (mix of HTTP + direct DB — **adapt to service-only**).
- `modules/rag_pipeline.py` — embeddings + FAISS top-k; skip for conversational intents.
- `services/prompt_service.py`, `faiss_builder.py`, `document_processor.py`, `s3_service.py` — knowledge ingest pipeline.

## DB patterns

- DB `elevate_golf_chat`, collection `chat_sessions`: upsert by `session_id`; fields messages, summary, entities, complaint_count, user_type, support_level, conversation_style, user_id, timestamps.
- Indexes: `session_id`, `user_id` (`mongo_service.py`).
- In-memory `chat_sessions` dict fallback if Mongo down.
- Soft-delete style on guardrail CMS docs (`isDeleted`); chat delete is hard delete.
- Tools open **second** Mongo client to app DB — anti-pattern for us (one connection module).
- No transactions; no audit.record equivalent.

## API patterns

- Prefix `/elly/...`: chat, ws, sessions, tips, profile, coach recommendation, health, internal.
- Pydantic models; errors as FastAPI `HTTPException` (`detail` string) — map to Arambh envelope.
- Chat response: `{ response, session_id, timestamp, history, suggestions, ticket_id, structured_data }`.
- WS payload JSON: message + user_id + user_token + style knobs; server pushes event objects.
- CORS `allow_origins=["*"]` — tighten in production.

## Auth / AuthZ

- No first-class auth middleware on Elly routes; trusts client-supplied `user_id` / `user_token`.
- `user_token` forwarded as Bearer to Elevate.Server for ticket tools (`_auth_headers`).
- **Adapt:** AI gateway behind same `requireAuth`; never accept bare user_id without JWT; tools use server-side ctx, not client token passthrough where avoidable.

## UI/UX patterns

N/A here. Pair with Application: suggested prompts, streaming bubble, ticket/coach structured cards, WS→REST fallback.

## Performance / security techniques

- Skip RAG for Greeting/Farewell/Thanks.
- Stream chunks over WS for perceived latency; tools resolved before stream.
- PII scrubbing + post-response phrase validation.
- FAISS local vector search; S3 for document ingest.
- Structlog in requirements; much logging still `print`.
- Mongo connection timeout + memory fallback.

## NOT worth reusing

- Direct Mongo reads of app collections from tools (bypasses services/RBAC).
- Unauthenticated public chat endpoints.
- FAISS+golf corpus as-is (Arambh needs club/booking knowledge + different embeddings ops).
- Python stack inside Node monorepo — run as sidecar or reimplement orchestrator in Node calling LLM APIs.
- Wide-open CORS and printing full errors to clients.

## Recommended adaptation

- Phase 16: Implement Node (or sidecar) orchestrator mirroring `ChatOrchestrator` stages; expose REST + WS (or SSE) with the same event names for mobile reuse.
- Tools: wrap `BookingService`, membership, shop read APIs only; confirmed writes via existing services + audit.
- Persist conversations in Mongo with indexes; summary/entities pattern from `memory_manager`.
- Port guardrails (PII + forbidden) with config collection; suggestions for “Deep” support level.
- Phase 1–2 prerequisites: auth on AI routes, shared error shape, no second DB connection.
- Do not import this repo; copy protocol + pipeline ideas only.
