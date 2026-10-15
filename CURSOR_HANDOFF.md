# BidWise AI — Cursor handoff

## Current state

BidWise is a working Next.js 16 hackathon prototype for **The Negotiator — Voice AI Agent**. It accepts a college event-printing brief, runs bounded negotiations against three clearly fictional vendors, stores the complete result in MongoDB, rejects offers that violate hard constraints, ranks eligible offers deterministically, and opens exact transcript evidence for the recommendation.

The repository is clean on branch `main`. Latest verified commit at handoff: `bec3b4d`.

## Start here

```powershell
cd "D:\Negotiator voice ai agent"
npm install
npm run dev
```

Open `http://localhost:3000`.

Before editing, read:

- `AGENTS.md` — Next.js version-specific rule.
- `README.md` — setup, architecture and demo flow.
- `docs/IMPLEMENTATION_ROADMAP.md` — phone, MongoDB and ML roadmap.

## Verified commands

```powershell
npm test
npm run typecheck
npm run build
```

At handoff: production build passed, TypeScript passed, and 12/12 tests passed.

## Working features

- Responsive negotiation UI and command center.
- Browser speech synthesis with separate BidWise/vendor voices.
- English and deterministic Hindi speech layers.
- Voice previews, speed control and saved voice settings.
- Three bounded fictional vendor negotiations.
- Zod-validated requests, sessions and structured offers.
- MongoDB Atlas support through `MONGODB_URI`.
- Persistent embedded MongoDB under `.data/mongodb` when Atlas is absent.
- Explicit in-memory degraded fallback.
- Deterministic hard constraints and weighted scoring.
- Transcript-backed evidence drawer.
- Failure isolation when one vendor does not answer.

## Important architecture

- `src/app/page.tsx` — client flow and voice orchestration.
- `src/lib/negotiation.ts` — bounded negotiation engine.
- `src/lib/scoring.ts` — deterministic eligibility and ranking.
- `src/lib/database.ts` — Atlas/embedded/fallback persistence.
- `src/lib/speech.ts` — English/Hindi spoken presentation layer.
- `src/lib/calling.ts` — phone capability boundary.
- `src/lib/types.ts` — schemas and domain types.
- `tests/core-flow.test.ts` — core behavior tests.

## Environment

Copy `.env.example` to `.env.local`. Never commit `.env.local`.

```dotenv
MONGODB_URI=
MONGODB_DB=bidwise
VAPI_API_KEY=
VAPI_PHONE_NUMBER_ID=
```

Leaving `MONGODB_URI` empty starts the persistent embedded MongoDB. The first run may download a MongoDB binary.

## Next tasks, in order

1. Keep the safe demo stable.
2. Make basket items, requirements and deadline editable.
3. Add a server-only Vapi provider implementing `startCall`, `getCallStatus` and verified webhook ingestion.
4. Require explicit human confirmation before any real number is dialed.
5. Make webhook handling idempotent and resilient to retries/timeouts.
6. Add an optional synthetic Random Forest only after the real-call adapter is stable.
7. Add authentication, consent records and retention controls after the hackathon.

## Non-negotiable guardrails

- Never label simulations as real calls or fictional vendors as real businesses.
- Never commit credentials.
- Never allow the agent to pay, book, sign, or bind the user.
- Never fabricate competitor prices.
- Validate model/provider output before persistence.
- The deterministic scorer—not an LLM or ML model—selects the winner.
- Every material offer field must cite an exact business transcript turn.
- A failed vendor must not fail the entire comparison.
- Keep `MAX_NEGOTIATION_ROUNDS` bounded.
- Preserve the safe demo even after real calls are added.

## Recommended first Cursor prompt

> Read `AGENTS.md`, `CURSOR_HANDOFF.md`, `README.md`, and `docs/IMPLEMENTATION_ROADMAP.md`. Inspect the current Git status and run the existing tests before editing. Continue the existing BidWise implementation; do not redesign it from scratch. First make the request basket, deadline, required benefits, and preferences editable while preserving schema validation, MongoDB persistence, deterministic scoring, transcript evidence, browser voice, safe demo mode, and all current tests. Add focused tests for any behavior you change.
