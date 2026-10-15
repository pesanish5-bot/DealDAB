# BidWise AI — The Negotiator

BidWise is a five-hour hackathon prototype for the challenge: **build voice agents that call businesses, compare offers, negotiate, and return an evidence-backed recommendation**.

The demo uses a college event-printing request and three fictional businesses. It visibly moves from an initial quote to a negotiated final quote, stores the transcript and structured offer, rejects offers that violate hard constraints, and links the recommendation back to exact business statements.

## What the prototype proves

- One request targets three businesses.
- Negotiations are bounded to four rounds.
- Initial and final offers are captured as structured data.
- MongoDB stores requests, businesses, sessions, transcripts, offers, and recommendations.
- Hard constraints are checked before scoring; an attractive price cannot excuse a missed deadline.
- The winner is chosen by deterministic, inspectable scoring—not by an LLM alone.
- Every material offer field cites a business transcript turn.
- One failed business does not prevent comparison of successful offers.

## Architecture

```text
Next.js UI
  ├─ New Negotiation form
  ├─ Negotiation Command Center + browser voice
  └─ Comparison, recommendation, and evidence drawer
             │
             ▼
Next.js API routes
  ├─ request validation (Zod)
  ├─ bounded negotiator + deterministic business simulator
  ├─ structured offer extraction
  ├─ hard-constraint validation and weighted scoring
  └─ persistence adapter
             │
             ▼
MongoDB Atlas or local embedded MongoDB
```

The intentionally small architecture keeps the complete demo in one Next.js application. Polling is sufficient for this prototype; no fragile realtime service is required.

## Local setup

Requirements: Node.js 20 or newer and npm.

```bash
npm install
copy .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Useful checks:

```bash
npm test
npm run typecheck
npm run build
```

Never commit `.env.local` or credentials.

## MongoDB modes

### Atlas

Set `MONGODB_URI` and, optionally, `MONGODB_DB` in `.env.local`. The app connects to Atlas and reports database mode `atlas`.

```dotenv
MONGODB_URI=mongodb+srv://USER:PASSWORD@CLUSTER/
MONGODB_DB=bidwise
```

### Embedded MongoDB

Leave `MONGODB_URI` empty. The app starts `mongodb-memory-server` with a persistent local database under `.data/mongodb` and reports mode `embedded`. The first run may download a MongoDB binary, so start it before judging.

If MongoDB cannot start or connect, the app explicitly reports degraded `memory` mode. This keeps the UI usable for diagnosis, but it is not the preferred judged demo because data is not durable.

## Truthful demo mode

The three vendor profiles and their conversations are fictional simulations. The UI must label them as simulated; they are not real calls, real vendors, or recordings. The negotiation logic, transcript creation, offer extraction, validation, scoring, evidence linking, and MongoDB persistence are executed by the application during the demo.

Browser text-to-speech makes the exchange audible without depending on telephony credentials. The Voice Studio lets the presenter choose separate installed voices for BidWise and the vendor, switch between English and a deterministic Hindi speech layer, and tune speaking speed. The canonical evidence transcript remains in English so citations stay stable. If a native Hindi browser voice is unavailable, the UI reports the fallback instead of claiming one exists.

If voice is unavailable, the same live transcript remains the reliable fallback. Real phone calling is the next provider integration, not a claim of this prototype. The health API already reports whether the required Vapi credentials are configured without exposing their values.

The concrete real-call, MongoDB and optional ML plan is documented in [docs/IMPLEMENTATION_ROADMAP.md](docs/IMPLEMENTATION_ROADMAP.md).

## API

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/health` | Report application/database health and active storage mode |
| `POST` | `/api/requests` | Validate and save a request; return the three demo businesses |
| `GET` | `/api/requests/:id` | Return the request or its completed negotiation bundle |
| `POST` | `/api/requests/:id/negotiate` | Run all bounded negotiations, persist results, and return the recommendation |

The request body follows `requestInputSchema` in `src/lib/types.ts`. The default demo request is exported from the same file.

## Two-minute demo

1. Open **New Negotiation** and show the event-printing basket, ₹12,000 target, ₹12,500 maximum, digital-proof requirement, and 8:00 AM deadline.
2. Start negotiation and point out the **Simulated vendor call** label.
3. Let the browser speak one exchange while the transcript shows the initial quote, counter, and improved final offer.
4. Show all three statuses. If one fails, explain that successful offers still proceed.
5. Open **Comparison**. QuickInk is cheaper but rejected because its 11:00 AM delivery misses the deadline.
6. Show **PixelPress Works** as the best eligible match at ₹12,400.
7. Click the price or delivery evidence and reveal the exact cited business transcript line.
8. Call out the current database mode and repeat the run to demonstrate reliability.

## Demo-safe guardrails

- The agent identifies itself and the simulated-call mode.
- It never fabricates competitor quotes, threatens, pays, books, or accepts a binding deal.
- `maximumPriceInr`, required benefits, and the deadline are enforced in code.
- Malformed or incomplete offers cannot become defensible recommendations.
- Optional ML remains out of the critical path until the end-to-end product works.

## Current limits

- Businesses and outcomes are controlled fictional demo data.
- Voice is browser-based; there is no production phone integration.
- Embedded MongoDB requires its binary to be available locally.
- The scoring weights are user-configurable inputs but are not learned from transaction history.

These limits are deliberate: the prototype prioritizes a complete, honest, repeatable negotiation-to-evidence flow over breadth.
