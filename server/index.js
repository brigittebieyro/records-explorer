const express = require("express");
const bodyParser = require("body-parser");
const pino = require("express-pino-logger")();
const cors = require("cors");
const corsAnywhere = require("cors-anywhere");

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(pino);
app.use(cors());

app.get("/api/greeting", (req, res) => {
  const name = req.query.name || "World";
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify({ greeting: `Hello ${name}!` }));
});

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

const PORT = 5001;
app.listen(PORT, () =>
  console.log(`Express + CORS proxy running on http://localhost:${PORT}`)
);
