'use strict';
const { applyCors } = require('./_cors');
/* Proxies chat completions to OpenRouter with the server-held key.
 * The model chain is built from OpenRouter's live list of :free models
 * (cached 1h, DEBATE_MODELS env overrides) and tried in order until one
 * answers — so a withdrawn or rate-limited free model never kills a
 * debate. The browser never sees any credential or model choice. */
const DEFAULT_CHAIN = [
    'meta-llama/llama-3.3-70b-instruct:free',
    'deepseek/deepseek-chat-v3-0324:free',
    'google/gemma-3-27b-it:free'
];
const PREF = ['meta-llama/llama-3.3', 'deepseek/', 'qwen/', 'google/gemma', 'meta-llama/', 'mistralai/', 'google/', ''];
const rank = id => PREF.findIndex(p => id.startsWith(p));

let cachedChain = null, cachedAt = 0;
async function getChain(upstream, key) {
    const env = (process.env.DEBATE_MODELS || '').split(',').map(m => m.trim()).filter(Boolean);
    if (env.length) return env;
    if (cachedChain && Date.now() - cachedAt < 3600e3) return cachedChain;
    try {
        const r = await fetch(upstream + '/api/v1/models', { headers: { 'Authorization': 'Bearer ' + key } });
        if (r.ok) {
            const d = await r.json();
            const free = (d.data || []).map(m => m.id).filter(id => typeof id === 'string' && id.endsWith(':free'));
            const chain = free.sort((a, b) => rank(a) - rank(b)).slice(0, 6);
            if (chain.length) { cachedChain = chain; cachedAt = Date.now(); return chain; }
        }
    } catch { /* fall back below */ }
    return DEFAULT_CHAIN;
}

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
    let last = { status: 502, text: JSON.stringify({ error: { message: 'no models configured' } }) };
    try {
        for (const model of await getChain(upstream, key)) {
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
        cachedChain = null;                                  // stale chain? refresh next call
        res.statusCode = last.status;
        try {
            const d = JSON.parse(last.text);
            if (d && d.error) d.error.message = 'All debate models failed. Last error: ' + d.error.message;
            res.end(JSON.stringify(d));
        } catch { res.end(last.text); }
    } catch (e) {
        res.statusCode = 502;
        res.end(JSON.stringify({ error: { message: 'Upstream request failed: ' + e.message } }));
    }
};
