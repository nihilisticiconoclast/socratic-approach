'use strict';
module.exports = (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
        proxy: Boolean(process.env.OPENROUTER_API_KEY),
        db: Boolean(process.env.DATABASE_URL || process.env.NEON_DATABASE_URL)
    }));
};
