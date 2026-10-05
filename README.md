# Scam SMS Checker — "Inaam nikla hai?"

Detection core for a Pakistan-focused scam message checker. A user pastes a suspicious SMS or
WhatsApp message and gets a one-word verdict in Urdu, Roman Urdu and English, plus the red flags,
the official helpline and a ready-made PTA 9000 report text.

This repository holds **only the detection core and a stateless `/api/check` endpoint** (plan
weeks 3–4). The WhatsApp bot, OCR, voice (STT/TTS), web UI, auth and dashboards are later phases.

## Pipeline (plan §6.1)

```
text (+ optional sender)
 ├─ normalize   NFKC, Arabic→Urdu code points, zero-width/look-alike folding,
 │              URLs, 03xx mobiles, amounts ("25,00,000", "25 lakh")
 ├─ Stage 1     deterministic rules H1–H5, S1–S6, P1   (src/core/rules.ts)
 ├─ Stage 2     optional LLM classifier (Gemini, JSON, temp 0) on redacted text
 └─ Stage 3     decision layer: rules can never be lowered by the LLM
```

| Verdict          | Shown to user                                       |
|------------------|-----------------------------------------------------|
| `SCAM_CONFIRMED` | 🔴 Yeh FRAUD hai.                                   |
| `LIKELY_SCAM`    | 🟠 Fraud lagta hai — hoshyar rahein.                |
| `UNSURE`         | 🟡 Pakka nahi keh sakte — pehle tasdeeq karein.     |
| `LIKELY_SAFE`    | 🟢 Bazahir theek lagta hai — phir bhi PIN/OTP kabhi na dein. |

There is no "safe" verdict. Every reply carries the universal PIN/OTP safety tip.

### Safety guarantees (enforced by tests)

- Any H1/H2/H3 → `SCAM_CONFIRMED`; H4/H5 or ≥ 2 soft flags → `LIKELY_SCAM`. The LLM may raise these, never lower them.
- `LIKELY_SAFE` only from P1 (a High-confidence official sender, verified in the last 6 months, with no asks, links or call-back), or from the LLM when the rules found nothing at all.
- When the rules defer (one soft flag, or nothing found) and there is no LLM, the verdict is `UNSURE`.
- Message text is untrusted: it is redacted (CNIC, IBAN, OTP codes, account numbers) and JSON-encoded inside delimiters before any LLM call. LLM output is schema-validated, and helplines it suggests are kept only if they are on the official list.
- No message content is stored or logged.

## Usage

```bash
npm install
npm test              # unit tests + fixture eval (rules-only)
npx tsc --noEmit      # typecheck
npm run check:concept # runs the plan's concept message, prints the JSON result
```

The LLM is optional. Copy `.env.example` to `.env` (or set Vercel env vars) and set `GEMINI_API_KEY`
to enable it. Without the key, everything runs rules-only.

### API (Vercel function)

```http
POST /api/check
{ "text": "Mubarak ho! BISP ki taraf se ...", "sender": "0341-XXXXXXX" }
```

The response is `CheckResult` (see `src/check.ts`): `verdict`, `headline`, `red_flags` (max 3),
`explanation` {ur, roman, en}, `recommended_action`, `official_helpline`, `needs_sender`, `report`
(the PTA 9000 text) and `rule_flags`, plus `meta` (rules/prompt versions, LLM status, latency).

## Layout

```
api/check.ts                 Vercel function
src/check.ts                 orchestrator
src/core/normalize.ts        normalization + extraction
src/core/keywords.ts         keyword lists (Urdu / Roman Urdu / English)
src/core/match.ts            token matching, fuzzy Roman Urdu
src/core/rules.ts            H1–H5, S1–S6, P1
src/core/decision.ts         scoring + LLM merge
src/core/officialSenders.ts  official list from plan §3.1 (with confidence + verified_on)
src/core/redact.ts           PII redaction
src/core/wording.ts          verdict text, labels, safety tip
src/llm/                     provider interface, Gemini implementation, prompt, schema
db/migrations/001_init.sql   Postgres schema (not used yet)
tests/                       vitest suites + fixtures/messages.json
```

To swap Gemini for another provider, implement `LlmClassifier` (`src/llm/provider.ts`) and return
it from `createClassifierFromEnv`.

## Maintenance

- The official list must be re-verified monthly (plan §3.3). Entries older than 6 months stop producing the P1 signal automatically.
- Add every misclassified message to `tests/fixtures/messages.json`. The eval fails on any dangerous miss (scam → `LIKELY_SAFE`).

Not affiliated with BISP, PTA, NCCIA, SBP or any bank or telco.
