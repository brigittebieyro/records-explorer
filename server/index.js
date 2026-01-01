const express = require("express");
const bodyParser = require("body-parser");
const pino = require("express-pino-logger")();
const cors = require("cors");

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(pino);
app.use(cors());

app.get("/api/greeting", (req, res) => {
  const name = req.query.name || "World";
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify({ greeting: `Hello ${name}!` }));
});

var request = require("request");
app.get("/", function (req, res) {
  //modify the url in any way you want
  console.log("SERVER LOG", req, res);
  var newurl = "https://admin-usaw-rankings.sport80.com/";
  request(newurl).pipe(res);
});

// app.use("/rankings", proxy("https://admin-usaw-rankings.sport80.com"));

app.listen(5001, () =>
  console.log("Express server is running on localhost:5001")
);
