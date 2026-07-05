'use strict';
const { applyCors } = require('./_cors');
/* Proxies chat completions to OpenRouter with the server-held key.
 * Tries a chain of models in order until one answers, so a failing or
 * rate-limited free model never kills a debate. The browser never sees
 * any credential and never chooses the model. */
const DEFAULT_CHAIN = [
    'meta-llama/llama-3.3-70b-instruct:free',
    'deepseek/deepseek-chat-v3-0324:free',
    'google/gemma-3-27b-it:free',
    'mistralai/mistral-small-3.1-24b-instruct:free'
];

module.exports = async (req, res) => {
    if (applyCors(req, res)) return;
    if (req.method !== 'POST') { res.statusCode = 405; return res.end(); }
    const key = (process.env.OPENROUTER_API_KEY || '').trim().replace(/^["']+|["']+$/g, '');
    res.setHeader('Content-Type', 'application/json');
    if (!key) {
        res.statusCode = 503;
        return res.end(JSON.stringify({ error: { message: 'OPENROUTER_API_KEY is not configured on the server' } }));
    }
    const upstream = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai';
    const models = (process.env.DEBATE_MODELS || '').split(',').map(m => m.trim()).filter(Boolean);
    const chain = models.length ? models : DEFAULT_CHAIN;
    let last = { status: 502, text: JSON.stringify({ error: { message: 'no models configured' } }) };
    try {
        for (const model of chain) {
            const r = await fetch(upstream + '/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + key,
                    'Content-Type': 'application/json',
                    'X-Title': 'Socratic Approach'
                },
                body: JSON.stringify({ ...req.body, model })
            });
            const text = await r.text();
            if (r.ok) {
                try {
                    const d = JSON.parse(text);
                    const c = d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
                    if (c && c.trim()) { res.statusCode = 200; return res.end(text); }
                } catch { /* fall through to next model */ }
            }
            console.warn(`model ${model} failed (HTTP ${r.status}), trying next`);
            last = { status: r.status, text };
        }
        res.statusCode = last.status;
        res.end(last.text);
    } catch (e) {
        res.statusCode = 502;
        res.end(JSON.stringify({ error: { message: 'Upstream request failed: ' + e.message } }));
    }
};
