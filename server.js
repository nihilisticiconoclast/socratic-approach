#!/usr/bin/env node
/*
 * Local dev server — mirrors the production API (the api/ functions on the
 * deployment host) so the page behaves identically in both places.
 *
 *   OPENROUTER_API_KEY=sk-or-... DATABASE_URL=postgres://... node server.js
 *   → http://localhost:3000
 *
 * DATABASE_URL is optional locally (history/recording become no-ops).
 * `npm install` first if you want database access (pulls in pg).
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

let pg = null;
try { pg = require('pg'); } catch { /* optional locally */ }

const KEY = (process.env.OPENROUTER_API_KEY || '').trim().replace(/^["']+|["']+$/g, '');
// Model fallback chain: tried in order until one answers. Override with
// DEBATE_MODELS (comma-separated OpenRouter model ids).
const DEFAULT_CHAIN = [
    'meta-llama/llama-3.3-70b-instruct:free',
    'deepseek/deepseek-chat-v3-0324:free',
    'google/gemma-3-27b-it:free',
    'mistralai/mistral-small-3.1-24b-instruct:free'
];
const ENV_MODELS = (process.env.DEBATE_MODELS || '').split(',').map(m => m.trim()).filter(Boolean);

// Free models come and go: build the chain from OpenRouter's live model list
// (cached 1h), preferring strong families first. DEBATE_MODELS overrides.
let cachedChain = null, cachedAt = 0;
const PREF = ['meta-llama/llama-3.3', 'deepseek/', 'qwen/', 'google/gemma', 'meta-llama/', 'mistralai/', 'google/', ''];
const rank = id => PREF.findIndex(p => id.startsWith(p));
async function getChain() {
    if (ENV_MODELS.length) return ENV_MODELS;
    if (cachedChain && Date.now() - cachedAt < 3600e3) return cachedChain;
    try {
        const r = await fetch(UPSTREAM + '/api/v1/models', { headers: { 'Authorization': 'Bearer ' + KEY } });
        if (r.ok) {
            const d = await r.json();
            const free = (d.data || []).map(m => m.id).filter(id => typeof id === 'string' && id.endsWith(':free'));
            const chain = free.sort((a, b) => rank(a) - rank(b)).slice(0, 6);
            if (chain.length) {
                cachedChain = chain; cachedAt = Date.now();
                console.log('model chain from live list:', chain.join(', '));
                return chain;
            }
        }
    } catch { /* fall back below */ }
    return DEFAULT_CHAIN;
}
const UPSTREAM = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai';
const DB_URL = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || '';
const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const MAX_BODY = 1024 * 1024;
const TYPES = { '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.js': 'text/javascript' };

let ensured = false;
async function withDb(fn) {
    if (!DB_URL) return null;
    if (!pg) { console.warn('DATABASE_URL is set but pg is not installed - run: npm install'); return null; }
    const client = new pg.Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
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

const send = (res, code, obj) => {
    res.writeHead(code, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(obj));
};

const readBody = req => new Promise((resolve, reject) => {
    let body = '';
    req.on('data', d => { body += d; if (body.length > MAX_BODY) req.destroy(); });
    req.on('end', () => { try { resolve(body ? JSON.parse(body) : {}); } catch (e) { reject(e); } });
});

const CORS_ORIGIN = process.env.CORS_ORIGIN || '';

http.createServer(async (req, res) => {
    const url = req.url.split('?')[0];
    if (CORS_ORIGIN && url.startsWith('/api/')) {
        res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN);
        res.setHeader('Vary', 'Origin');
        if (req.method === 'OPTIONS') {
            res.writeHead(204, {
                'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            });
            return res.end();
        }
    }
    try {
        if (url === '/api/health') {
            return send(res, 200, { proxy: Boolean(KEY), db: Boolean(DB_URL) });
        }
        if (url === '/api/diag') {
            const { runDiag } = require('./api/diag.js');
            return send(res, 200, await runDiag(UPSTREAM, KEY));
        }
        if (url === '/api/chat' && req.method === 'POST') {
            if (!KEY) return send(res, 503, { error: { message: 'OPENROUTER_API_KEY is not configured on the server' } });
            const body = await readBody(req);
            let last = { status: 502, text: JSON.stringify({ error: { message: 'no models configured' } }) };
            for (const model of await getChain()) {
                const r = await fetch(UPSTREAM + '/api/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json', 'X-Title': 'Socratic Approach' },
                    body: JSON.stringify({ ...body, model })
                });
                const text = await r.text();
                if (r.ok) {
                    try {
                        const d = JSON.parse(text);
                        const c = d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
                        if (c && c.trim()) { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(text); }
                    } catch { /* fall through to next model */ }
                }
                console.warn(`model ${model} failed (HTTP ${r.status}), trying next`);
                last = { status: r.status, text };
            }
            cachedChain = null;                       // stale chain? refresh next call
            try {
                const d = JSON.parse(last.text);
                if (d && d.error) d.error.message = 'All debate models failed. Last error: ' + d.error.message;
                return send(res, last.status, d);
            } catch { res.writeHead(last.status, { 'Content-Type': 'application/json' }); return res.end(last.text); }
        }
        if (url === '/api/history') {
            const rows = await withDb(db =>
                db.query('SELECT question, verdict FROM debates ORDER BY created_at DESC LIMIT 5').then(r => r.rows));
            return send(res, 200, { debates: rows || [] });
        }
        if (url === '/api/record' && req.method === 'POST') {
            const { question, transcript, verdict, consensus, model } = await readBody(req);
            if (!question || !Array.isArray(transcript) || !verdict) return send(res, 400, { error: 'invalid record' });
            const ok = await withDb(db => db.query(
                'INSERT INTO debates (question, transcript, verdict, consensus, model) VALUES ($1, $2, $3, $4, $5)',
                [String(question).slice(0, 300), JSON.stringify(transcript), String(verdict), Boolean(consensus), String(model || '')]));
            return send(res, 200, { stored: ok !== null });
        }
    } catch (e) {
        return send(res, 500, { error: { message: e.message } });
    }

    // Static files, confined to the project dir
    const rel = url === '/' ? 'index.html' : url.slice(1);
    const fp = path.join(ROOT, path.normalize(rel));
    if (!fp.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    fs.readFile(fp, (err, data) => {
        if (err) { res.writeHead(404); return res.end('Not found'); }
        res.writeHead(200, { 'Content-Type': TYPES[path.extname(fp)] || 'application/octet-stream' });
        res.end(data);
    });
}).listen(PORT, () => {
    console.log(`Socratic Approach on http://localhost:${PORT}`);
    console.log(`  OpenRouter key: ${KEY ? 'configured' : 'MISSING (debates will not run)'}`);
    console.log(`  Database:       ${DB_URL ? (pg ? 'configured' : 'set but pg not installed') : 'not set (history disabled)'}`);
});
