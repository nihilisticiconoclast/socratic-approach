#!/usr/bin/env node
/*
 * Debate runner — executed by GitHub Actions (.github/workflows/debate.yml).
 *
 * Reads the question from $QUESTION, runs the six-persona debate through
 * OpenRouter using the repo secret, stores the result in Neon Postgres,
 * regenerates debates.json (the site's Chronicle), and — when triggered by
 * an issue — posts the verdict back to the issue and closes it.
 *
 * Env:
 *   OPENROUTER_API_KEY  (required)  OpenRouter key, from repo secrets
 *   DATABASE_URL        (required)  Neon Postgres connection string
 *   QUESTION            (required)  the question or statement to debate
 *   DEBATE_MODEL        (optional)  OpenRouter model id
 *   ISSUE_NUMBER / GITHUB_TOKEN / GITHUB_REPOSITORY  (optional) issue reporting
 */
'use strict';

const fs = require('fs');
const { Client } = require('pg');

const KEY = process.env.OPENROUTER_API_KEY;
const DB_URL = process.env.DATABASE_URL;
const MODEL = process.env.DEBATE_MODEL || 'meta-llama/llama-3.3-70b-instruct:free';
const MAX_TURNS = 2;            // rounds before the Judge must rule
const CALL_DELAY_MS = 1500;     // free-tier rate limits
const MEMORY_LIMIT = 5;         // past debates fed back in as context

const STYLE_RULES = 'Stay strictly in character. Reply in 2-4 short sentences of plain ' +
    'spoken prose: no markdown, no lists, no stage directions, no quotation of your own name.';

const PERSONAS = [
    { id: 'socrates', name: 'Socrates',
      system: 'You are Socrates, the probing questioner in a debate among six ancient Greek ' +
        'philosophers. Use the Socratic method: never state your own opinion. Ask short, ' +
        'pointed questions that expose hidden assumptions and contradictions in the topic ' +
        'or in what the others have said. ' + STYLE_RULES },
    { id: 'contrarian', name: 'Contrarian',
      system: 'You are the Contrarian, the devil\'s advocate in a debate among six ancient ' +
        'Greek philosophers. Whatever position currently dominates the discussion, argue ' +
        'the opposite, sharply but honestly, to test the strength of the idea. ' + STYLE_RULES },
    { id: 'freethinker', name: 'Free Thinker',
      system: 'You are the Free Thinker, the open-minded explorer in a debate among six ' +
        'ancient Greek philosophers. Be creative and speculative: expand the space of ' +
        'possibilities, question constraints, and offer unconventional angles no one else ' +
        'has considered. ' + STYLE_RULES },
    { id: 'grump', name: 'Grump',
      system: 'You are the Grump, the closed-minded critic in a debate among six ancient ' +
        'Greek philosophers. Be cynical, dismissive and resistant to new ideas: voice ' +
        'doubts, grumble about impracticality, and puncture enthusiasm. ' + STYLE_RULES },
    { id: 'synthesizer', name: 'Synthesizer',
      system: 'You are the Synthesizer, the integrator in a debate among six ancient Greek ' +
        'philosophers. Be balanced and analytical: identify common ground between the ' +
        'speakers, reconcile opposing views, and restate the emerging shared position. ' + STYLE_RULES },
    { id: 'judge', name: 'Judge',
      system: 'You are the Judge, the arbitrator in a debate among six ancient Greek ' +
        'philosophers. Be fair and decisive: weigh the arguments made so far, name the ' +
        'strongest points on each side, and guide the group toward consensus. ' + STYLE_RULES }
];
const DEBATER_ORDER = ['socrates', 'contrarian', 'freethinker', 'grump', 'synthesizer'];
const VERDICT_RE = /\bVERDICT:\s*(CONSENSUS|CONTINUE)\b/i;

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function llm(system, user) {
    let lastErr;
    for (let attempt = 0; attempt < 4; attempt++) {
        if (attempt > 0) await sleep(4000 * attempt);
        try {
            const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + KEY,
                    'Content-Type': 'application/json',
                    'X-Title': 'Socratic Approach'
                },
                body: JSON.stringify({
                    model: MODEL, max_tokens: 300,
                    messages: [{ role: 'system', content: system }, { role: 'user', content: user }]
                })
            });
            if (res.status === 429 || res.status >= 500) { lastErr = new Error('HTTP ' + res.status); continue; }
            if (!res.ok) {
                const detail = await res.json().catch(() => null);
                throw new Error((detail && detail.error && detail.error.message) || 'OpenRouter HTTP ' + res.status);
            }
            const data = await res.json();
            const text = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
            if (!text || !text.trim()) { lastErr = new Error('empty completion'); continue; }
            return text.trim();
        } catch (e) { lastErr = e; }
    }
    throw lastErr || new Error('OpenRouter request failed');
}

function buildPrompt(topic, transcript, memory, extra) {
    let out = '';
    if (memory.length) {
        out += 'The philosophers keep records of past symposia. Recent questions and verdicts, ' +
               'which you may draw on where relevant:\n';
        for (const m of memory)
            out += `- "${m.question}" -> ${String(m.verdict).slice(0, 200)}\n`;
        out += '\n';
    }
    out += `The topic under debate: "${topic}"\n\n`;
    if (transcript.length) {
        out += 'Transcript so far:\n';
        for (const t of transcript) out += `${t.speaker}: ${t.text}\n`;
        out += '\n';
    }
    out += extra || 'It is now your turn to speak.';
    return out;
}

async function github(pathname, method, body) {
    const token = process.env.GITHUB_TOKEN, repo = process.env.GITHUB_REPOSITORY;
    if (!token || !repo) return;
    const res = await fetch(`https://api.github.com/repos/${repo}${pathname}`, {
        method,
        headers: {
            'Authorization': 'Bearer ' + token,
            'Accept': 'application/vnd.github+json',
            'Content-Type': 'application/json'
        },
        body: body ? JSON.stringify(body) : undefined
    });
    if (!res.ok) console.error(`GitHub API ${pathname}: HTTP ${res.status} ${await res.text()}`);
}

async function main() {
    const question = (process.env.QUESTION || '').trim().replace(/\s+/g, ' ').slice(0, 300);
    if (!question) throw new Error('No question provided (QUESTION env is empty)');
    if (!KEY) throw new Error('OPENROUTER_API_KEY secret is missing');
    if (!DB_URL) throw new Error('DATABASE_URL secret is missing (your Neon connection string)');

    const db = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
    await db.connect();
    await db.query(`CREATE TABLE IF NOT EXISTS debates (
        id SERIAL PRIMARY KEY,
        question TEXT NOT NULL,
        transcript JSONB NOT NULL,
        verdict TEXT NOT NULL,
        consensus BOOLEAN NOT NULL,
        model TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);

    // (b) augmentation: recent history informs the new debate
    const memory = (await db.query(
        'SELECT question, verdict FROM debates ORDER BY created_at DESC LIMIT $1', [MEMORY_LIMIT]
    )).rows;

    console.log(`Debating: "${question}" (model ${MODEL}, ${memory.length} past debates as context)`);

    const debaters = DEBATER_ORDER.map(id => PERSONAS.find(p => p.id === id));
    const judge = PERSONAS.find(p => p.id === 'judge');
    const transcript = [];
    let consensus = false;

    for (let round = 1; round <= MAX_TURNS && !consensus; round++) {
        for (const p of debaters) {
            const text = await llm(p.system, buildPrompt(question, transcript, memory));
            transcript.push({ speaker: p.name, text });
            console.log(`[round ${round}] ${p.name}: ${text}`);
            await sleep(CALL_DELAY_MS);
        }
        const raw = await llm(judge.system, buildPrompt(question, transcript, memory,
            'It is now your turn to speak. Briefly assess the round, then end your reply with a ' +
            'final line reading exactly "VERDICT: CONSENSUS" if the group has substantially ' +
            'converged, or "VERDICT: CONTINUE" if the debate should go on.'));
        const m = raw.match(VERDICT_RE);
        consensus = Boolean(m && m[1].toUpperCase() === 'CONSENSUS');
        const clean = raw.replace(VERDICT_RE, '').replace(/\n{2,}/g, '\n').trim();
        transcript.push({ speaker: judge.name, text: clean });
        console.log(`[round ${round}] Judge: ${clean} (consensus: ${consensus})`);
        await sleep(CALL_DELAY_MS);
    }

    const verdict = await llm(judge.system, buildPrompt(question, transcript, memory,
        'The debate has ended. Deliver the final verdict: name the strongest arguments heard and ' +
        'state the group\'s consensus position on the topic in at most five sentences.'));
    console.log('Final verdict:', verdict);

    // (a) chronicle: persist to Neon
    await db.query(
        'INSERT INTO debates (question, transcript, verdict, consensus, model) VALUES ($1, $2, $3, $4, $5)',
        [question, JSON.stringify(transcript), verdict, consensus, MODEL]);

    // Publish the Chronicle for the static site
    const all = (await db.query(
        'SELECT question, transcript, verdict, consensus, created_at FROM debates ORDER BY created_at DESC LIMIT 50'
    )).rows;
    fs.writeFileSync('debates.json', JSON.stringify({ generated: new Date().toISOString(), debates: all }));
    console.log(`Wrote debates.json with ${all.length} debates`);
    await db.end();

    // Report back to the submitting issue, if any
    const issue = process.env.ISSUE_NUMBER;
    if (issue) {
        const lines = transcript.map(t => `**${t.speaker}:** ${t.text}`).join('\n\n');
        await github(`/issues/${issue}/comments`, 'POST', {
            body: `**The philosophers have ruled${consensus ? ' — consensus reached' : ' — no full consensus'}.**\n\n` +
                  `> ${question}\n\n<details><summary>Transcript</summary>\n\n${lines}\n\n</details>\n\n` +
                  `**Verdict:**\n\n${verdict}\n\n_This debate has been added to the Chronicle._`
        });
        await github(`/issues/${issue}`, 'PATCH', { state: 'closed' });
    }
}

main().catch(async e => {
    console.error('Debate failed:', e);
    const issue = process.env.ISSUE_NUMBER;
    if (issue) await github(`/issues/${issue}/comments`, 'POST', {
        body: `The debate could not be completed: \`${String(e.message).slice(0, 300)}\`\n\n` +
              'Check the Actions run for details.'
    }).catch(() => {});
    process.exit(1);
});
