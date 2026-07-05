'use strict';
const { applyCors } = require('./_cors');
/* Diagnostic endpoint: tests the OpenRouter key, the free-model list, and a
 * single live completion from inside the deployment, and prints a plain-
 * language hint naming the fix. Exposes no secrets. Open /api/diag in a
 * browser; if it returns Not Found, the host is running an old build. */
const PREF = ['meta-llama/llama-3.3', 'deepseek/', 'qwen/', 'google/gemma', 'meta-llama/', 'mistralai/', 'google/', ''];
const rank = id => PREF.findIndex(p => id.startsWith(p));

async function runDiag(upstream, key) {
    const out = { app: 'socratic-approach', diagVersion: 1, time: new Date().toISOString() };
    if (!key) { out.key = 'MISSING - set OPENROUTER_API_KEY on the host and redeploy'; return out; }
    try {
        const kr = await fetch(upstream + '/api/v1/key', { headers: { 'Authorization': 'Bearer ' + key } });
        if (kr.ok) {
            const kd = await kr.json();
            out.key = 'ok';
            out.keyInfo = {
                label: kd.data && kd.data.label,
                usage: kd.data && kd.data.usage,
                is_free_tier: kd.data && kd.data.is_free_tier
            };
        } else {
            out.key = 'INVALID (HTTP ' + kr.status + ') - re-copy the key from openrouter.ai/keys';
        }
    } catch (e) { out.key = 'OpenRouter unreachable: ' + e.message; }

    try {
        const mr = await fetch(upstream + '/api/v1/models', { headers: { 'Authorization': 'Bearer ' + key } });
        if (mr.ok) {
            const md = await mr.json();
            const free = (md.data || []).map(m => m.id).filter(id => typeof id === 'string' && id.endsWith(':free'));
            out.freeModelsAvailable = free.length;
            out.chainPreview = free.sort((a, b) => rank(a) - rank(b)).slice(0, 6);
        } else {
            out.freeModelsAvailable = 'list failed (HTTP ' + mr.status + ')';
        }
    } catch (e) { out.freeModelsAvailable = 'unreachable: ' + e.message; }

    const model = (Array.isArray(out.chainPreview) && out.chainPreview[0]) || 'meta-llama/llama-3.3-70b-instruct:free';
    out.testModel = model;
    try {
        const tr = await fetch(upstream + '/api/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json', 'X-Title': 'Socratic Approach' },
            body: JSON.stringify({ model, max_tokens: 16, messages: [{ role: 'user', content: 'Reply with the single word OK' }] })
        });
        const tt = await tr.text();
        if (tr.ok) {
            try {
                const td = JSON.parse(tt);
                out.testResult = 'ok: ' + String(td.choices[0].message.content || '').slice(0, 40);
            } catch { out.testResult = 'ok (unparsed response)'; }
        } else {
            let msg = tt.slice(0, 300);
            try { const td = JSON.parse(tt); msg = (td.error && td.error.message) || msg; } catch { /* keep raw */ }
            out.testResult = 'FAILED (HTTP ' + tr.status + '): ' + msg;
        }
    } catch (e) { out.testResult = 'unreachable: ' + e.message; }

    const t = String(out.testResult);
    if (/data policy|privacy/i.test(t))
        out.hint = 'FIX: free models are blocked by your OpenRouter privacy settings. Go to openrouter.ai -> Settings -> Privacy and enable prompt training/logging for free endpoints. This one toggle blocks ALL :free models.';
    else if (/rate limit|free-models-per-day/i.test(t) || /FAILED \(HTTP 429\)/.test(t))
        out.hint = 'FIX: daily free-model quota exhausted. Accounts with under $10 lifetime credits get ~50 free requests/day; one debate uses ~13. Wait for the daily reset, or add $10 credit at openrouter.ai to raise the limit to ~1000/day.';
    else if (/INVALID/.test(String(out.key)))
        out.hint = 'FIX: the API key on the host is wrong. Re-copy it from openrouter.ai/keys into the host env var and redeploy.';
    else if (t.startsWith('ok'))
        out.hint = 'Everything works from this server. If the page still fails, it is running an old build - redeploy latest main and hard-refresh the page.';
    else
        out.hint = 'Unclassified failure - send the testResult text above to your developer.';
    return out;
}

module.exports = async (req, res) => {
    if (applyCors(req, res)) return;
    res.setHeader('Content-Type', 'application/json');
    const key = (process.env.OPENROUTER_API_KEY || '').trim().replace(/^["']+|["']+$/g, '');
    const upstream = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai';
    res.end(JSON.stringify(await runDiag(upstream, key), null, 2));
};
module.exports.runDiag = runDiag;
