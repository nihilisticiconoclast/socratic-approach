'use strict';
const { applyCors } = require('./_cors');
module.exports = (req, res) => {
    if (applyCors(req, res)) return;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
        proxy: Boolean(process.env.OPENROUTER_API_KEY),
        db: Boolean(process.env.DATABASE_URL || process.env.NEON_DATABASE_URL)
    }));
};
