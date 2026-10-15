# DealDAB

DealDAB is a voice AI negotiation platform that can contact or simulate conversations with multiple businesses, negotiate offers, compare final deals, and return an evidence-backed recommendation.

This repository is a hackathon prototype. The demo uses a college event-printing request and three fictional businesses. It moves from an initial quote to a negotiated final quote, stores the transcript and structured offer in MongoDB, rejects offers that violate hard constraints, and links the recommendation back to exact business statements.

Real phone calling is not implemented. The running demo uses browser speech and clearly labeled simulated vendors.

## Core features

- One request targets three businesses.
- Negotiations are bounded to four rounds.
- Initial and final offers are captured as structured data.
- MongoDB stores requests, businesses, sessions, transcripts, offers, and recommendations.
- Hard constraints are checked before scoring; an attractive price cannot excuse a missed deadline.
- The winner is chosen by deterministic, inspectable scoring.
- Every material offer field cites a business transcript turn.
- One failed business does not prevent comparison of successful offers.

## Architecture

The product is one Next.js application. There is no separate backend process.

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

## Tech stack

- Next.js 16 and React 19
- TypeScript
- Zod request and offer validation
- MongoDB driver, with `mongodb-memory-server` for the local demo
- Vitest

## Project structure

- `src/app` — pages and API routes
- `src/components` — command center, voice studio, comparison, and evidence UI
- `src/lib` — negotiation, scoring, speech, persistence, and types
- `tests` — core demo-flow tests
- `docs/IMPLEMENTATION_ROADMAP.md` — planned real-call and later work

## Setup

Requirements: Node.js 20 or newer and npm.

```bash
npm install
copy .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Checks:

```bash
npm test
npm run typecheck
npm run build
```

Never commit `.env.local` or credentials.

## Environment variables

Copy `.env.example` to `.env.local`. Names only:

```dotenv
MONGODB_URI=
MONGODB_DB=dealdab
VAPI_API_KEY=
VAPI_PHONE_NUMBER_ID=
```

`VAPI_API_KEY` and `VAPI_PHONE_NUMBER_ID` are reserved for a future phone provider. They are not used to place calls in this prototype. The health API reports whether they are present without exposing their values.

## MongoDB

### Atlas

Set `MONGODB_URI` and, optionally, `MONGODB_DB` in `.env.local`. The app connects to Atlas and reports database mode `atlas`. If `MONGODB_DB` is omitted, the database name is `dealdab`.

### Embedded MongoDB

Leave `MONGODB_URI` empty. The app starts `mongodb-memory-server` with a persistent local database under `.data/mongodb` and reports mode `embedded`. The database name is `dealdab`. The first run may download a MongoDB binary.

If MongoDB cannot start or connect, the app reports degraded `memory` mode. The UI stays usable for diagnosis, but that mode is not durable.

## Demo mode and real calls

The three vendor profiles and their conversations are fictional simulations. The UI labels them as simulated. They are not real calls, real vendors, or recordings. Negotiation, transcript creation, offer extraction, validation, scoring, evidence linking, and MongoDB persistence run inside the application during the demo.

Browser text-to-speech makes the exchange audible without telephony credentials. The Voice Studio lets the presenter choose separate installed voices for DealDAB and the vendor, switch between English and a deterministic Hindi speech layer, and tune speaking speed. The canonical evidence transcript remains in English so citations stay stable. If a native Hindi browser voice is unavailable, the UI reports the fallback.

If voice is unavailable, the live transcript is the fallback. Real phone calling is documented as next work in [docs/IMPLEMENTATION_ROADMAP.md](docs/IMPLEMENTATION_ROADMAP.md).

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
4. Show all three statuses. If one fails, successful offers still proceed.
5. Open **Comparison**. QuickInk is cheaper but rejected because its 11:00 AM delivery misses the deadline.
6. Show **PixelPress Works** as the best eligible match at ₹12,400.
7. Click the price or delivery evidence and reveal the exact cited business transcript line.
8. Call out the current database mode and repeat the run to demonstrate reliability.

## Guardrails

- The agent identifies itself and the simulated-call mode.
- It never fabricates competitor quotes, threatens, pays, books, or accepts a binding deal.
- `maximumPriceInr`, required benefits, and the deadline are enforced in code.
- Malformed or incomplete offers cannot become recommendations.
- Optional ML stays out of the critical path.

## Known limitations

- Businesses and outcomes are controlled fictional demo data.
- Voice is browser-based. There is no production phone integration.
- Embedded MongoDB requires its binary to be available locally.
- Scoring weights are configurable inputs. They are not learned from transaction history.
