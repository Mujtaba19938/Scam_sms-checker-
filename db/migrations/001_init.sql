-- Scam SMS Checker — initial schema (plan §3.3, §8.2). Schema only; not used by the
-- current stateless /api/check. The canonical seed for official_senders lives in
-- src/core/officialSenders.ts (transcribed from plan §3.1).
--
-- Privacy: no table here stores raw message text. Redacted samples for opted-in users
-- ("check_content", 7-day retention) are intentionally deferred.

create table if not exists official_senders (
  id            bigserial primary key,
  entity        text not null,
  kind          text not null check (kind in ('sms_sender', 'helpline', 'service_code', 'domain')),
  value         text not null,
  purpose       text not null,
  never_does    text[] not null default '{}',
  confidence    text not null check (confidence in ('High', 'Medium', 'Uncertain', 'Unverified')),
  verified_on   date not null,
  source        text not null,
  source_url    text,
  version       integer not null default 1,
  unique (kind, value, entity)
);

create table if not exists checks (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid,
  channel        text not null check (channel in ('web', 'whatsapp', 'android', 'api')),
  input_type     text not null check (input_type in ('text', 'screenshot', 'voice')),
  verdict        text not null check (verdict in ('SCAM_CONFIRMED', 'LIKELY_SCAM', 'UNSURE', 'LIKELY_SAFE')),
  scam_type      text not null,
  flags          text[] not null default '{}',
  confidence     real,
  model_version  text,
  rules_version  text not null,
  latency_ms     integer,
  feedback       text check (feedback in ('correct', 'wrong')),
  created_at     timestamptz not null default now()
);

create index if not exists checks_created_at_idx on checks (created_at);
