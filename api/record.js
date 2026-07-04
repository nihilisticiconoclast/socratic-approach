'use strict';
const { applyCors } = require('./_cors');
/* Persists a completed debate to Neon. Internal chronicle only. */
const { withDb } = require('./_db');

module.exports = async (req, res) => {
    if (applyCors(req, res)) return;
    if (req.method !== 'POST') { res.statusCode = 405; return res.end(); }
    res.setHeader('Content-Type', 'application/json');
    const { question, transcript, verdict, consensus, model } = req.body || {};
    if (!question || !Array.isArray(transcript) || !verdict) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: 'invalid record' }));
    }
    try {
        const ok = await withDb(db => db.query(
            'INSERT INTO debates (question, transcript, verdict, consensus, model) VALUES ($1, $2, $3, $4, $5)',
            [String(question).slice(0, 300), JSON.stringify(transcript),
             String(verdict), Boolean(consensus), String(model || '')]));
        res.end(JSON.stringify({ stored: ok !== null }));
    } catch (e) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: String(e.message) }));
    }
};
