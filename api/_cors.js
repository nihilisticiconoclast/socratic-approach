'use strict';
/* Cross-origin support for split deployments (e.g. GitHub Pages frontend +
 * Render/Railway/Fly backend). Set CORS_ORIGIN on the backend to the
 * frontend's origin. Same-origin deployments need none of this. */
function applyCors(req, res) {
    const origin = process.env.CORS_ORIGIN;
    if (!origin) return false;
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Access-Control-Max-Age', '86400');
        res.statusCode = 204;
        res.end();
        return true;
    }
    return false;
}
module.exports = { applyCors };
