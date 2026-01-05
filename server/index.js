const express = require("express");
const bodyParser = require("body-parser");
const pino = require("express-pino-logger")();
const cors = require("cors");
const corsAnywhere = require("cors-anywhere");

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(pino);
app.use(cors());

// Mount CORS-Anywhere 
const proxyServer = corsAnywhere.createServer({
  originWhitelist: [], // Allow all origins
  requireHeader: [],
  removeHeaders: ["cookie", "cookie2"],
});

app.use('/api/lifter-data', (req, res) => {
  // Rewrite the incoming URL so cors-anywhere sees the target URL as the first path segment
  // Incoming: /api/lifter-data/api/categories/... -> cors-anywhere expects /https://host/api/...
  const targetBase = 'https://admin-usaw-rankings.sport80.com/api/';
  const suffix = req.originalUrl.replace(/^\/api\/lifter-data/, '');
  req.url = `/${targetBase}${suffix}`;
  proxyServer.emit('request', req, res);
});

// Serve React build if available (for containerized deployments)
const path = require('path');
const fs = require('fs');
const buildDir = path.join(__dirname, '..', 'build');
if (fs.existsSync(buildDir)) {
  // Serve static files from build directory
  app.use(express.static(buildDir));
  
  // Fallback to index.html for SPA routing (only for non-API routes)
  app.all('/{*any}', (req, res) => {
    // Don't serve index.html for API routes
    if (!req.path.startsWith('/api/')) {
      res.sendFile(path.join(buildDir, 'index.html'));
    } else {
      res.status(404).json({ error: 'Not found' });
    }
  });
}

const PORT = process.env.PORT || 5001;
app.listen(PORT, '0.0.0.0', () =>
  console.log(`Express + CORS proxy running on http://0.0.0.0:${PORT}`)
);
