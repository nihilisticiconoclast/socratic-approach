#!/usr/bin/env node
/*
 * Minimal server for Socratic Approach — zero dependencies.
 *
 * Holds the OpenRouter key server-side and proxies chat completions so the
 * browser never sees or asks for the key.
 *
 *   OPENROUTER_API_KEY=sk-or-... node server.js
 *   → http://localhost:3000  (key field hidden automatically)
 *
 * Without the env var it still serves the app; the page falls back to
 * asking for a key, exactly like opening index.html directly.
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const KEY = process.env.OPENROUTER_API_KEY || '';
const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const MAX_BODY = 1024 * 1024; // 1 MiB

const TYPES = { '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.js': 'text/javascript' };

const server = http.createServer((req, res) => {
    const url = req.url.split('?')[0];

    if (url === '/api/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ proxy: Boolean(KEY) }));
    }

    if (url === '/api/chat' && req.method === 'POST') {
        if (!KEY) {
            res.writeHead(503, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: { message: 'OPENROUTER_API_KEY is not set on the server' } }));
        }
        let body = '';
        req.on('data', d => {
            body += d;
            if (body.length > MAX_BODY) req.destroy();
        });
        req.on('end', async () => {
            try {
                const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer ' + KEY,
                        'Content-Type': 'application/json',
                        'X-Title': 'Socratic Approach'
                    },
                    body
                });
                const text = await r.text();
                res.writeHead(r.status, { 'Content-Type': 'application/json' });
                res.end(text);
            } catch (e) {
                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: { message: 'Upstream request failed: ' + e.message } }));
            }
        });
        return;
    }

    // Static files (index.html and any assets), confined to the project dir
    const rel = url === '/' ? 'index.html' : url.slice(1);
    const fp = path.join(ROOT, path.normalize(rel));
    if (!fp.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    fs.readFile(fp, (err, data) => {
        if (err) { res.writeHead(404); return res.end('Not found'); }
        res.writeHead(200, { 'Content-Type': TYPES[path.extname(fp)] || 'application/octet-stream' });
        res.end(data);
    });
});

server.listen(PORT, () => {
    console.log(`Socratic Approach on http://localhost:${PORT}` +
                (KEY ? ' (server-held OpenRouter key: page will not ask for one)' :
                       ' (no OPENROUTER_API_KEY set: page will ask for a key)'));
});
