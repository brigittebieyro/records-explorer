// Dev-server proxy for the Express API.
//
// Not strictly required any more. It was added when the certificate opened via a link: CRA's
// "proxy" field skips any GET whose Accept header includes text/html
// (react-dev-utils/WebpackDevServerUtils.js), which is exactly what a target="_blank" navigation
// sends, so /api/certificate came back as the app shell. The certificate is posted now, and a
// fetch never sends that Accept header, so the built-in proxy would cope.
//
// Kept because it is more predictable than the "proxy" field: an explicit 127.0.0.1 target, and
// no content-type-dependent skipping to reason about. If you do delete it, re-test a certificate
// under `npm start` rather than assuming.
//
// Mounting here takes over all four existing /api routes too. That is benign: they are fetch()
// calls, and the server applies a blanket cors().
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
