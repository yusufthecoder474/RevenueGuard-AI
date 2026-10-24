CREATE TABLE IF NOT EXISTS report_runs (
 id TEXT PRIMARY KEY, created_at TEXT NOT NULL, input_hash TEXT NOT NULL,
 provider TEXT NOT NULL, model TEXT NOT NULL, prompt_version TEXT NOT NULL,
 fact_hash TEXT NOT NULL, validation_status TEXT NOT NULL,
 failure_reason TEXT, latency_ms REAL NOT NULL, token_usage TEXT, cost_usd REAL
);
CREATE INDEX IF NOT EXISTS report_runs_time ON report_runs(created_at DESC);
