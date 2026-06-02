-- ─── Stayflexi Postgres Init Script ─────────────────────────────────────────
-- Runs automatically on first database creation (empty volume).
-- Adds commonly-needed extensions.
-- ─────────────────────────────────────────────────────────────────────────────

-- UUID generation (gen_random_uuid, uuid_generate_v4)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Cryptographic functions (crypt, gen_salt, gen_random_bytes)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Trigram index support for fuzzy text search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
