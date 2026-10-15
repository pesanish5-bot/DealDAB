# DealDAB implementation roadmap

## What is working now

- Browser speech synthesis voices both sides of three bounded negotiations.
- Fictional vendors are clearly identified; generated sessions are not presented as real calls.
- MongoDB stores requests, businesses, negotiation sessions, complete transcripts, structured offers and recommendations.
- Zod validates request, session and offer structures before persistence.
- A deterministic scoring engine applies hard budget, delivery and proof requirements before ranking eligible offers.
- Every quoted fact in the result points to a specific transcript turn.

## Real phone calls (P1)

Use one provider only: Vapi for the hackathon path. It supplies phone transport and can call the backend with status/transcript events. DealDAB remains responsible for negotiation policy, offer validation, persistence and ranking.

1. Add `VAPI_API_KEY` and `VAPI_PHONE_NUMBER_ID` locally; never expose either to the browser.
2. Create a server-only call provider implementing `startCall`, `getCallStatus` and webhook verification.
3. Start one vendor call at a time and attach the request and business IDs as provider metadata.
4. Convert verified webhook messages into the existing `NegotiationSession` schema.
5. Run the same validated extraction, scoring and evidence pipeline used by safe demo mode.
6. Require human approval before a real number is called. The agent can collect offers but cannot purchase or accept a contract.

The safe demo remains the judging fallback even after real calling is connected.

## MongoDB implementation

The application supports three explicit modes:

- `atlas`: selected when `MONGODB_URI` is configured.
- `embedded`: a persistent local MongoDB process stored under `.data/mongodb`; this is the current working mode.
- `memory`: a clearly reported degraded fallback only when MongoDB cannot start.

Indexes enforce one offer per request/business and one recommendation per request. The result API reads the saved bundle back from MongoDB rather than relying only on browser state.

## Optional Random Forest (P2)

Do not train it to choose the winner. The deterministic scorer stays authoritative.

Training target: `vendor_accepts_next_counter`.

Candidate features:

- category and order size
- opening quote relative to budget
- current discount percentage
- negotiation round
- requested delivery urgency
- number of hard constraints
- vendor flexibility profile (simulation only)
- whether the previous counter requested price or a perk

Initial training data will be explicitly labeled synthetic data generated from the three simulator policies. Use train/validation/test splits separated by simulated negotiation session, not individual turns. Report precision, recall, ROC-AUC and calibration only from the held-out synthetic test set, and label all metrics as synthetic. Do not claim that this predicts real vendor behavior.

The model may suggest whether to ask for one more discount or switch to perks. It may not override constraints, invent offers, or create evidence.

Before any production use, replace synthetic rows with consented, anonymized real outcomes and revalidate for category and vendor bias.

## Remaining order of work

1. Keep safe demo mode stable and rehearse the two-minute judge flow.
2. Connect a single Vapi test number only if credentials and permission are available.
3. Add webhook signature verification, retries and idempotency.
4. Add the synthetic Random Forest only after the real-call adapter is stable.
5. Add authentication, consent records and retention controls after the hackathon.
