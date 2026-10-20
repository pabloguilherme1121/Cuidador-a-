CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY NOT NULL,
  auth_hash TEXT NOT NULL,
  read_hash TEXT,
  iv TEXT NOT NULL,
  ciphertext TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL
);

-- Chat stores only authenticated ciphertext; the secret stays in the URL fragment.
CREATE TABLE IF NOT EXISTS room_messages (
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  iv TEXT NOT NULL,
  ciphertext TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (room_id, id)
);
CREATE INDEX IF NOT EXISTS room_messages_latest ON room_messages(room_id,created_at DESC,id DESC);

-- Short-lived, pseudonymous throttling for anonymous room creation. No raw IPs or patient data.
CREATE TABLE IF NOT EXISTS creation_quotas (
  bucket TEXT PRIMARY KEY NOT NULL,
  used INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS creation_quotas_expiry ON creation_quotas(expires_at);
