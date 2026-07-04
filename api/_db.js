'use strict';
/* Shared Neon Postgres access for the API functions.
 * The debates table is internal storage: it chronicles every debate and
 * feeds recent history back into new debates. It is never shown as UI. */
const { Client } = require('pg');

let ensured = false;

async function withDb(fn) {
    const url = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
    if (!url) return null;
    const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
    await client.connect();
    try {
        if (!ensured) {
            await client.query(`CREATE TABLE IF NOT EXISTS debates (
                id SERIAL PRIMARY KEY,
                question TEXT NOT NULL,
                transcript JSONB NOT NULL,
                verdict TEXT NOT NULL,
                consensus BOOLEAN NOT NULL,
                model TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now()
            )`);
            ensured = true;
        }
        return await fn(client);
    } finally {
        await client.end();
    }
}

module.exports = { withDb };
