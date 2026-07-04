'use strict';
const { applyCors } = require('./_cors');
/* Returns recent questions and verdicts. Consumed only by the debate
 * orchestrator to give the philosophers memory of past symposia. */
const { withDb } = require('./_db');

module.exports = async (req, res) => {
    if (applyCors(req, res)) return;
    res.setHeader('Content-Type', 'application/json');
    try {
        const rows = await withDb(db =>
            db.query('SELECT question, verdict FROM debates ORDER BY created_at DESC LIMIT 5')
              .then(r => r.rows));
        res.end(JSON.stringify({ debates: rows || [] }));
    } catch (e) {
        res.end(JSON.stringify({ debates: [], error: String(e.message) }));
    }
};
