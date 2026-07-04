'use strict';
/* Proxies chat completions to OpenRouter with the server-held key.
 * The browser never sees or sends any credential. */
module.exports = async (req, res) => {
    if (req.method !== 'POST') { res.statusCode = 405; return res.end(); }
    const key = process.env.OPENROUTER_API_KEY;
    res.setHeader('Content-Type', 'application/json');
    if (!key) {
        res.statusCode = 503;
        return res.end(JSON.stringify({ error: { message: 'OPENROUTER_API_KEY is not configured on the server' } }));
    }
    try {
        const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + key,
                'Content-Type': 'application/json',
                'X-Title': 'Socratic Approach'
            },
            body: JSON.stringify(req.body)
        });
        res.statusCode = r.status;
        res.end(await r.text());
    } catch (e) {
        res.statusCode = 502;
        res.end(JSON.stringify({ error: { message: 'Upstream request failed: ' + e.message } }));
    }
};
