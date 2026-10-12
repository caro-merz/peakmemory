CREATE TABLE IF NOT EXISTS checkout_orders (
  id TEXT PRIMARY KEY,
  submission_key TEXT NOT NULL UNIQUE,
  payload_digest TEXT NOT NULL,
  status_token TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','expired')),
  stage TEXT NOT NULL DEFAULT 'staging' CHECK (stage IN ('staging','ready','session','deleting','purged')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  origin TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  configuration TEXT NOT NULL,
  filename TEXT NOT NULL,
  acceptance INTEGER NOT NULL CHECK (acceptance = 1),
  gpx_key TEXT NOT NULL,
  preview_key TEXT NOT NULL,
  session_id TEXT UNIQUE,
  session_url TEXT,
  session_params TEXT NOT NULL,
  shipping TEXT,
  paid_at INTEGER,
  owner_sent INTEGER NOT NULL DEFAULT 0,
  buyer_sent INTEGER NOT NULL DEFAULT 0,
  lease TEXT,
  lease_until INTEGER NOT NULL DEFAULT 0,
  notify_lease TEXT,
  notify_until INTEGER NOT NULL DEFAULT 0,
  notify_after INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS checkout_events (
  id TEXT PRIMARY KEY,
  digest TEXT NOT NULL,
  order_id TEXT NOT NULL REFERENCES checkout_orders(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS checkout_retry ON checkout_orders(status, notify_after);
CREATE INDEX IF NOT EXISTS checkout_retention ON checkout_orders(created_at, paid_at);
