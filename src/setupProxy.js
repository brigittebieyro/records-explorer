// Dev-server proxy for the Express API.
//
// This file is REQUIRED for the certificate link to work under `npm start`. CRA's "proxy" field
// in package.json skips any GET whose Accept header includes text/html
// (react-dev-utils/WebpackDevServerUtils.js), which is exactly what a target="_blank" navigation
// sends -- so /api/certificate would return index.html instead of a PDF, and you would get the
// app shell in a new tab.
//
// Mounting here takes over all four existing /api routes too. That is benign: they are fetch()
// calls (no text/html Accept), and the server applies a blanket cors().
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  app.use(
    '/api',
    createProxyMiddleware({
      // 127.0.0.1 rather than 0.0.0.0: the latter is a bind address, not a destination, and
      // resolves inconsistently as a target.
      target: 'http://127.0.0.1:5001',
      changeOrigin: true,
      // v2 defaults to very chatty output on every proxied request.
      logLevel: 'warn',
      // No pathRewrite needed. Express strips the '/api' mount from req.url, but
      // http-proxy-middleware v2 forwards req.originalUrl, so the server still sees
      // /api/certificate. Verified end to end rather than assumed -- if this ever starts
      // forwarding the stripped path, requests land on the SPA catch-all and come back as
      // index.html with a 200, which looks like a working proxy serving the wrong thing.
    })
  );
};
