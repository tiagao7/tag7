-- TAg7 - esquema inicial (Cloudflare D1 / SQLite)
-- Convenções: datas/horas em INTEGER (epoch ms, UTC). Toda tabela de negócio tem shop_id (multi-tenant).
PRAGMA foreign_keys = ON;

CREATE TABLE shops (
  id            TEXT PRIMARY KEY,
  slug          TEXT NOT NULL UNIQUE CHECK (slug GLOB '[a-z0-9-]*' AND length(slug) BETWEEN 3 AND 40),
  name          TEXT NOT NULL,
  owner_phone   TEXT,
  timezone      TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  rules_json    TEXT NOT NULL DEFAULT '{}',   -- sobrescreve DEFAULT_RULES do @tag7/core
  brand_json    TEXT NOT NULL DEFAULT '{}',   -- cores, logo
  license_key   TEXT,
  created_at    INTEGER NOT NULL
);

CREATE TABLE barbers (
  id          TEXT PRIMARY KEY,
  shop_id     TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  phone       TEXT,
  login       TEXT NOT NULL,
  pass_hash   TEXT NOT NULL,                  -- PBKDF2 (Workers), nunca texto puro
  role        TEXT NOT NULL DEFAULT 'BARBER' CHECK (role IN ('OWNER','BARBER')),
  failed_logins INTEGER NOT NULL DEFAULT 0,
  locked_until  INTEGER,
  active      INTEGER NOT NULL DEFAULT 1,
  UNIQUE (shop_id, login)
);

CREATE TABLE services (
  id            TEXT PRIMARY KEY,
  shop_id       TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  duration_min  INTEGER NOT NULL CHECK (duration_min BETWEEN 5 AND 480),
  price_cents   INTEGER NOT NULL CHECK (price_cents >= 0),
  active        INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE working_hours (
  id           TEXT PRIMARY KEY,
  shop_id      TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  barber_id    TEXT NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
  weekday      INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time   TEXT NOT NULL,                 -- 'HH:MM' local
  end_time     TEXT NOT NULL,
  break_start  TEXT,
  break_end    TEXT,
  UNIQUE (barber_id, weekday)
);

CREATE TABLE time_off (
  id         TEXT PRIMARY KEY,
  shop_id    TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  barber_id  TEXT NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
  start_at   INTEGER NOT NULL,
  end_at     INTEGER NOT NULL CHECK (end_at > start_at),
  reason     TEXT
);

CREATE TABLE customers (
  id          TEXT PRIMARY KEY,
  shop_id     TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  phone       TEXT NOT NULL,                  -- normalizado E.164
  name        TEXT NOT NULL,
  consent_at  INTEGER NOT NULL,               -- LGPD: registro do consentimento
  blocked     INTEGER NOT NULL DEFAULT 0,
  no_show_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE (shop_id, phone)
);

CREATE TABLE appointments (
  id                TEXT PRIMARY KEY,
  shop_id           TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  barber_id         TEXT NOT NULL REFERENCES barbers(id),
  customer_id       TEXT NOT NULL REFERENCES customers(id),
  service_id        TEXT NOT NULL REFERENCES services(id),
  start_at          INTEGER NOT NULL,
  end_at            INTEGER NOT NULL CHECK (end_at > start_at),
  status            TEXT NOT NULL DEFAULT 'CONFIRMED'
                    CHECK (status IN ('CONFIRMED','CANCELLED','RESCHEDULED','DONE','NO_SHOW')),
  manage_token_hash TEXT NOT NULL UNIQUE,     -- só o hash; o token vai no link do cliente
  rescheduled_from  TEXT REFERENCES appointments(id),
  source            TEXT NOT NULL DEFAULT 'ONLINE' CHECK (source IN ('ONLINE','MANUAL')),
  created_at        INTEGER NOT NULL,
  updated_at        INTEGER NOT NULL,
  cancelled_at      INTEGER
);

-- Última linha de defesa contra duplo agendamento (a regra principal está no @tag7/core,
-- executada dentro de transação). Impede dois ativos no mesmo instante/barbeiro.
CREATE UNIQUE INDEX uq_active_slot
  ON appointments (barber_id, start_at)
  WHERE status IN ('CONFIRMED','DONE');

CREATE INDEX idx_appt_shop_day   ON appointments (shop_id, barber_id, start_at);
CREATE INDEX idx_appt_customer   ON appointments (shop_id, customer_id, status);

CREATE TABLE push_subscriptions (
  id         TEXT PRIMARY KEY,
  shop_id    TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  barber_id  TEXT NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL UNIQUE,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE audit_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_id    TEXT NOT NULL,
  actor      TEXT NOT NULL,                   -- 'barber:<id>' | 'customer:<id>' | 'system'
  action     TEXT NOT NULL,                   -- ex.: APPOINTMENT_CANCELLED
  entity     TEXT NOT NULL,
  entity_id  TEXT NOT NULL,
  at         INTEGER NOT NULL
);
CREATE INDEX idx_audit_shop_at ON audit_log (shop_id, at);
